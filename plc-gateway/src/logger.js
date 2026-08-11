import { appendFileSync, existsSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'

export function createLogger(logDirectory) {
  const logPath = path.join(logDirectory, 'gateway.log')
  return Object.assign((event, details = {}) => {
    try {
      if (existsSync(logPath) && statSync(logPath).size > 10 * 1024 * 1024) renameSync(logPath, `${logPath}.1`)
      const safe = Object.fromEntries(Object.entries(details).filter(([key]) => !/token|code|snapshot/i.test(key)))
      appendFileSync(logPath, `${JSON.stringify({ time: new Date().toISOString(), event, ...safe })}\n`, 'utf8')
    } catch {
      // 日志失败不能中断 PLC 通信。
    }
  }, { path: logPath })
}
