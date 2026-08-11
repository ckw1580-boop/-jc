# S7 Control PLC Gateway

Windows 本地网关把 Netlify 上的 S7 CONTROL 页面连接到同一局域网内的 S7-1200 或 S7-1500。网关只监听 `https://localhost:18443`，不会把 PLC IP、变量表或实时值发送到云端。

## 开发与打包

```powershell
pnpm install --frozen-lockfile
pnpm --filter s7-plc-gateway test
pnpm --filter s7-plc-gateway start
pnpm --filter s7-plc-gateway package:win
```

普通 `package:win` 用于本地和 PR 冒烟验证，产物明确视为未签名测试包，不可作为正式下载版本发布。

首次运行会在当前 Windows 用户证书库创建并信任一个仅用于 `localhost` 的 TLS 证书。该证书只保护浏览器到本地网关的 HTTPS 通信，不是 Windows Authenticode 代码签名证书。NSIS 卸载程序会移除 localhost 证书。

## 正式 Windows 代码签名

正式签名工作流位于 `.github/workflows/plc-gateway-signed-release.yml`，可手动运行，也会由 `plc-gateway-v*` 标签触发。工作流完成以下保护：

1. 从 GitHub `production-signing` Environment 的 Secrets 注入正式证书。
2. 使用 `forceCodeSigning=true` 构建；找不到有效证书时立即失败，不会产生“看似成功”的未签名正式包。
3. 同时验证安装器和安装目录内主程序的 Authenticode 状态、发布者及可信时间戳。
4. 仅在全部验证通过后上传 `s7-control-plc-gateway-windows-signed` 制品。

需要在 GitHub Environment `production-signing` 中配置：

- `WIN_CSC_LINK`：CA 签发的 Windows 代码签名 `.pfx` 文件的 Base64 内容，或 electron-builder 支持的安全证书地址。
- `WIN_CSC_KEY_PASSWORD`：PFX 密码。
- 可选 Repository Variable `WINDOWS_SIGNING_SUBJECT`：证书 Subject 中必须包含的发布者名称，用于防止误用其他证书。

PowerShell 编码 PFX：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('company-code-signing.pfx')) |
  Set-Clipboard
```

不要把 PFX、密码、Base64 内容或 Azure/CA 凭据提交到仓库、Issue、PR 日志或聊天记录。仓库已忽略 `*.pfx` 和 `*.p12`。

本地具有正式证书时可运行：

```powershell
$env:WIN_CSC_LINK = 'C:\secure\company-code-signing.pfx'
$env:WIN_CSC_KEY_PASSWORD = '<从安全凭据存储读取>'
pnpm run gateway:package:signed
pnpm run gateway:verify-signatures
```

## PLC 前置配置

- PLC IP 必须为 `10.0.0.0/8`、`172.16.0.0/12` 或 `192.168.0.0/16`，通信端口固定为 TCP 102。
- S7-1200/1500 需要在 TIA Portal 中启用 PUT/GET，并按固件要求授予对应权限。
- DB 偏移读取要求关闭目标 DB 的优化块访问。
- 当前支持 BOOL、BYTE、INT、REAL 和 TIME，以及 DB、I、Q、M 绝对地址。

PUT/GET 不提供传输层身份保护。只能在隔离、受控的工业网络和专用测试 PLC 上启用，不要将 TCP 102 暴露到互联网。
