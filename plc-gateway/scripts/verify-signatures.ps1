[CmdletBinding()]
param(
  [string[]]$Path = @(
    'plc-gateway/release/win-unpacked/S7 Control PLC Gateway.exe',
    'plc-gateway/release/S7-Control-PLC-Gateway-*-x64.exe'
  )
)

$ErrorActionPreference = 'Stop'

$files = foreach ($pattern in $Path) {
  Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue
}
$files = @($files | Sort-Object FullName -Unique)

if ($files.Count -eq 0) {
  throw 'No Windows executable was found for signature verification.'
}

$expectedSubject = $env:WINDOWS_SIGNING_SUBJECT
$results = foreach ($file in $files) {
  $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName

  if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate) {
    throw "Authenticode verification failed: $($file.FullName); status: $($signature.Status); $($signature.StatusMessage)"
  }

  if (-not $signature.TimeStamperCertificate) {
    throw "The signed file does not have a trusted timestamp: $($file.FullName)"
  }

  if ($expectedSubject -and $signature.SignerCertificate.Subject -notlike "*$expectedSubject*") {
    throw "The signing publisher does not match: $($file.FullName); actual: $($signature.SignerCertificate.Subject); expected to contain: $expectedSubject"
  }

  [pscustomobject]@{
    File = $file.FullName
    Status = $signature.Status
    Publisher = $signature.SignerCertificate.Subject
    Thumbprint = $signature.SignerCertificate.Thumbprint
    CertificateExpires = $signature.SignerCertificate.NotAfter.ToUniversalTime().ToString('O')
    TimestampAuthority = $signature.TimeStamperCertificate.Subject
  }
}

$results | Format-Table -AutoSize
Write-Host "Verified $($results.Count) formally signed file(s)."
