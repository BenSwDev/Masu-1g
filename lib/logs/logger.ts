type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    const logEntry = this.formatMessage(level, message, data)

    if (this.isDevelopment) {
      // In development, use console methods
      switch (level) {
        case "debug":
          console.debug(`[${logEntry.timestamp}] DEBUG: ${message}`, data || "")
          break
        case "info":
          console.info(`[${logEntry.timestamp}] INFO: ${message}`, data || "")
          break
        case "warn":
          console.warn(`[${logEntry.timestamp}] WARN: ${message}`, data || "")
          break
        case "error":
          console.error(`[${logEntry.timestamp}] ERROR: ${message}`, data || "")
          break
      }
    } else {
      // In production, use structured logging
      // was console logJSON.stringify(logEntry))
    }
  }

  debug(message: string, data?: any) {
    this.log("debug", message, data)
  }

  info(message: string, data?: any) {
    this.log("info", message, data)
  }

  warn(message: string, data?: any) {
    this.log("warn", message, data)
  }

  error(message: string, data?: any) {
    this.log("error", message, data)
  }
}

export const logger = new Logger()
