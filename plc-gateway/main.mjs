import { app, Menu, nativeImage, shell, Tray } from 'electron'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { ensureLocalCertificate } from './src/certificate.js'
import { createLogger } from './src/logger.js'
import { createGatewayServer } from './src/server.js'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

let tray
let gateway
let menuTimer

function trayIcon() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(app.getAppPath(), 'build', 'icon.ico')
  return nativeImage.createFromPath(iconPath)
}

function rebuildMenu() {
  if (!tray || !gateway) return
  const pairing = gateway.pairing.currentCode()
  tray.setToolTip(`S7 Control PLC Gateway · 配对码 ${pairing.code}`)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'S7 CONTROL PLC GATEWAY', enabled: false },
    { type: 'separator' },
    { label: `配对码：${pairing.code}`, enabled: false },
    { label: `有效期至：${new Date(pairing.expiresAt).toLocaleTimeString('zh-CN')}`, enabled: false },
    { label: `实际连接：${gateway.connectionCount()}`, enabled: false },
    { type: 'separator' },
    { label: '打开本地日志', click: () => shell.openPath(gateway.logPath) },
    { label: '重新生成配对码', click: () => { gateway.pairing.rotateCode(); rebuildMenu() } },
    { type: 'separator' },
    { label: '退出网关', click: () => app.quit() },
  ]))
}

app.whenReady().then(async () => {
  app.setAppUserModelId('cn.wcktlss.s7control.gateway')
  const userData = path.join(app.getPath('appData'), 'S7 Control PLC Gateway')
  app.setPath('userData', userData)
  mkdirSync(userData, { recursive: true })
  const logger = createLogger(userData)
  const tls = ensureLocalCertificate(userData)
  gateway = createGatewayServer({ tls, version: app.getVersion(), logger })
  gateway.logPath = logger.path
  await gateway.listen()
  logger('gateway-start', { version: app.getVersion(), port: 18443 })

  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true, path: process.execPath })
  tray = new Tray(trayIcon())
  rebuildMenu()
  tray.on('click', rebuildMenu)
  menuTimer = setInterval(rebuildMenu, 30000)
})

app.on('window-all-closed', (event) => event.preventDefault())
app.on('before-quit', () => {
  if (menuTimer) clearInterval(menuTimer)
  gateway?.close().catch(() => undefined)
})
