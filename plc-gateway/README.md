# S7 Control PLC Gateway

Windows 本地网关把 Netlify 上的 S7 CONTROL 页面连接到同一局域网内的 S7-1200 或 S7-1500。网关只监听 `https://localhost:18443`，不会把 PLC IP、变量表或实时值发送到云端。

## 开发与打包

```powershell
pnpm install --frozen-lockfile
pnpm --filter s7-plc-gateway test
pnpm --filter s7-plc-gateway start
pnpm --filter s7-plc-gateway package:win
```

首次运行会在当前 Windows 用户证书库创建并信任一个仅用于 `localhost` 的证书。NSIS 卸载程序会移除该证书；本地变量配置保存在浏览器中，网关不保存 PLC 值。

## PLC 前置配置

- PLC IP 必须为 `10.0.0.0/8`、`172.16.0.0/12` 或 `192.168.0.0/16`，通信端口固定为 TCP 102。
- S7-1200/1500 需要在 TIA Portal 中启用 PUT/GET，并按固件要求授予对应权限。
- DB 偏移读取要求关闭目标 DB 的优化块访问。
- 当前支持 BOOL、BYTE、INT、REAL 和 TIME，以及 DB、I、Q、M 绝对地址。

PUT/GET 不提供传输层身份保护。只能在隔离、受控的工业网络和专用测试 PLC 上启用，不要将 TCP 102 暴露到互联网。
