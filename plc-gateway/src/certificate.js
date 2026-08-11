import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

export function ensureLocalCertificate(userDataPath) {
  const tlsDirectory = path.join(userDataPath, 'tls')
  const metadataPath = path.join(tlsDirectory, 'metadata.json')
  if (existsSync(metadataPath)) {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
    if (existsSync(metadata.pfxPath)) return { pfx: readFileSync(metadata.pfxPath), passphrase: metadata.passphrase }
  }

  mkdirSync(tlsDirectory, { recursive: true })
  const pfxPath = path.join(tlsDirectory, 'localhost.pfx')
  const cerPath = path.join(tlsDirectory, 'localhost.cer')
  const passphrase = randomBytes(24).toString('hex')
  const friendlyName = 'S7 Control PLC Gateway Localhost'
  const script = [
    `$cert = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation 'Cert:\\CurrentUser\\My' -FriendlyName ${psQuote(friendlyName)} -NotAfter (Get-Date).AddYears(3) -KeyExportPolicy Exportable`,
    `$password = ConvertTo-SecureString ${psQuote(passphrase)} -AsPlainText -Force`,
    `Export-PfxCertificate -Cert $cert -FilePath ${psQuote(pfxPath)} -Password $password | Out-Null`,
    `Export-Certificate -Cert $cert -FilePath ${psQuote(cerPath)} | Out-Null`,
    `Import-Certificate -FilePath ${psQuote(cerPath)} -CertStoreLocation 'Cert:\\CurrentUser\\Root' | Out-Null`,
    `Write-Output $cert.Thumbprint`,
  ].join('; ')
  const thumbprint = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).at(-1)
  writeFileSync(metadataPath, JSON.stringify({ pfxPath, passphrase, thumbprint, friendlyName }, null, 2), { mode: 0o600 })
  return { pfx: readFileSync(pfxPath), passphrase }
}
