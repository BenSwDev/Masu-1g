type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"
  private isBuild = process.env.NEXT_PHASE === "phase-production-build"

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

    // During build, only show errors and warnings
    if (this.isBuild && level !== "error" && level !== "warn") {
      return
    }

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
          if (data && (typeof data === "string" || (typeof data === "object" && Object.keys(data).length > 0))) {
            console.error(`[${logEntry.timestamp}] ERROR: ${message}`, data)
          } else {
            console.error(`[${logEntry.timestamp}] ERROR: ${message}`)
          }
          break
      }
    } else {
      // In production, use structured logging but hide timestamps during build
      if (this.isBuild) {
        // During build, simplified logging
        switch (level) {
          case "warn":
            console.warn(`WARN: ${message}`)
            break
          case "error":
            console.error(`ERROR: ${message}`)
            break
        }
      } else {
        // Runtime production logging with full structure
        console.log(JSON.stringify(logEntry))
      }
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
