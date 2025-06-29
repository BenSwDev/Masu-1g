import { logger } from "./logger"

interface LogEvent {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
  route?: string
}

class ProductionLogger {
  private static instance: ProductionLogger
  private logs: LogEvent[] = []
  private maxLogs = 1000 // Keep last 1000 logs in memory

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger()
    }
    return ProductionLogger.instance
  }

  log(level: LogEvent['level'], message: string, context?: Record<string, any>) {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      requestId: this.getRequestId(),
      route: this.getCurrentRoute(),
      userId: this.getCurrentUserId()
    }

    // Add to memory store
    this.logs.push(logEvent)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest log
    }

    // Log to console (Vercel will capture this)
    const logLine = `[${logEvent.timestamp}] [${level.toUpperCase()}] [${logEvent.route || 'unknown'}] ${message}`
    
    if (context) {
      console.log(logLine, context)
    } else {
      console.log(logLine)
    }

    // In production, also send to external logging service if needed
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEvent)
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context)
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context)
  }

  // Get recent logs for debugging
  getRecentLogs(limit = 100): LogEvent[] {
    return this.logs.slice(-limit)
  }

  // Get logs by level
  getLogsByLevel(level: LogEvent['level'], limit = 100): LogEvent[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit)
  }

  // Get logs for specific user
  getLogsForUser(userId: string, limit = 100): LogEvent[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
  }

  private getRequestId(): string | undefined {
    // Try to get request ID from headers or context
    if (typeof window === 'undefined') {
      // Server side
      return process.env.VERCEL_REQUEST_ID || undefined
    }
    return undefined
  }

  private getCurrentRoute(): string | undefined {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return undefined
  }

  private getCurrentUserId(): string | undefined {
    // This would need to be set from your auth context
    return undefined
  }

  private async sendToExternalLogger(logEvent: LogEvent) {
    // Here you could send to external logging services like:
    // - LogRocket
    // - Sentry
    // - DataDog
    // - Custom webhook
    
    try {
      // Example: Send to webhook
      if (process.env.LOGGING_WEBHOOK_URL) {
        await fetch(process.env.LOGGING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEvent)
        })
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error)
    }
  }
}

export const prodLogger = ProductionLogger.getInstance()
export default prodLogger 
