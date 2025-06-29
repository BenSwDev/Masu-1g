import { logger } from "./logger"
import prodLogger from "./vercel-logger"

interface BookingLogContext {
  bookingId?: string
  userId?: string
  guestEmail?: string
  treatmentId?: string
  step?: number | string
  action?: string
  amount?: number
  paymentStatus?: string
  professionalId?: string
  error?: any
  duration?: number
  metadata?: Record<string, any>
}

interface BookingLogEntry extends BookingLogContext {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  phase: 'initiation' | 'validation' | 'calculation' | 'creation' | 'payment' | 'confirmation' | 'completion' | 'error'
  sessionId?: string
}

class BookingLogger {
  private static instance: BookingLogger
  private bookingLogs: Map<string, BookingLogEntry[]> = new Map()
  private sessionLogs: Map<string, BookingLogEntry[]> = new Map()

  static getInstance(): BookingLogger {
    if (!BookingLogger.instance) {
      BookingLogger.instance = new BookingLogger()
    }
    return BookingLogger.instance
  }

  private generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  logBookingEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    phase: BookingLogEntry['phase'],
    message: string,
    context: BookingLogContext = {}
  ) {
    const logEntry: BookingLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      phase,
      sessionId: context.metadata?.sessionId || this.generateSessionId(),
      ...context
    }

    // Store by booking ID if available
    if (context.bookingId) {
      if (!this.bookingLogs.has(context.bookingId)) {
        this.bookingLogs.set(context.bookingId, [])
      }
      this.bookingLogs.get(context.bookingId)!.push(logEntry)
    }

    // Store by session ID
    if (logEntry.sessionId) {
      if (!this.sessionLogs.has(logEntry.sessionId)) {
        this.sessionLogs.set(logEntry.sessionId, [])
      }
      this.sessionLogs.get(logEntry.sessionId)!.push(logEntry)
    }

    // Log to main logger and production logger
    const logMessage = `[BOOKING:${phase}] ${message}`
    const logContext = {
      bookingFlow: true,
      ...context,
      phase,
      sessionId: logEntry.sessionId
    }

    logger[level](logMessage, logContext)
    prodLogger[level](logMessage, logContext)

    // Clean up old logs to prevent memory leaks
    this.cleanupOldLogs()
  }

  // Specific booking phases
  logInitiation(context: BookingLogContext & { treatmentId: string }, message = "Booking process initiated") {
    this.logBookingEvent('info', 'initiation', message, context)
  }

  logValidation(context: BookingLogContext, message: string, isError = false) {
    this.logBookingEvent(isError ? 'error' : 'info', 'validation', message, context)
  }

  logCalculation(context: BookingLogContext & { amount?: number }, message: string) {
    this.logBookingEvent('info', 'calculation', message, context)
  }

  logCreation(context: BookingLogContext & { bookingId: string }, message = "Booking created") {
    this.logBookingEvent('info', 'creation', message, context)
  }

  logPayment(context: BookingLogContext & { paymentStatus: string }, message: string) {
    const level = context.paymentStatus === 'failed' ? 'error' : 'info'
    this.logBookingEvent(level, 'payment', message, context)
  }

  logConfirmation(context: BookingLogContext, message = "Booking confirmed") {
    this.logBookingEvent('info', 'confirmation', message, context)
  }

  logCompletion(context: BookingLogContext, message = "Booking process completed") {
    this.logBookingEvent('info', 'completion', message, context)
  }

  logError(context: BookingLogContext, error: any, message = "Booking error occurred") {
    this.logBookingEvent('error', 'error', message, {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    })
  }

  // Get logs for specific booking
  getBookingLogs(bookingId: string): BookingLogEntry[] {
    return this.bookingLogs.get(bookingId) || []
  }

  // Get logs for specific session
  getSessionLogs(sessionId: string): BookingLogEntry[] {
    return this.sessionLogs.get(sessionId) || []
  }

  // Get all recent booking logs
  getRecentBookingLogs(limit = 50): BookingLogEntry[] {
    const allLogs: BookingLogEntry[] = []
    
    for (const logs of this.bookingLogs.values()) {
      allLogs.push(...logs)
    }
    
    return allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Get logs by phase
  getLogsByPhase(phase: BookingLogEntry['phase'], limit = 50): BookingLogEntry[] {
    const allLogs: BookingLogEntry[] = []
    
    for (const logs of this.bookingLogs.values()) {
      allLogs.push(...logs.filter(log => log.phase === phase))
    }
    
    return allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  // Get error logs
  getErrorLogs(limit = 50): BookingLogEntry[] {
    return this.getLogsByPhase('error', limit)
  }

  // Generate booking flow summary
  generateBookingFlowSummary(bookingId: string): {
    bookingId: string
    phases: string[]
    duration: number
    errors: number
    warnings: number
    timeline: BookingLogEntry[]
  } {
    const logs = this.getBookingLogs(bookingId)
    
    if (logs.length === 0) {
      return {
        bookingId,
        phases: [],
        duration: 0,
        errors: 0,
        warnings: 0,
        timeline: []
      }
    }

    const phases = [...new Set(logs.map(log => log.phase))]
    const firstLog = logs[0]
    const lastLog = logs[logs.length - 1]
    const duration = new Date(lastLog.timestamp).getTime() - new Date(firstLog.timestamp).getTime()
    const errors = logs.filter(log => log.level === 'error').length
    const warnings = logs.filter(log => log.level === 'warn').length

    return {
      bookingId,
      phases,
      duration,
      errors,
      warnings,
      timeline: logs
    }
  }

  private cleanupOldLogs() {
    const maxLogsPerBooking = 100
    const maxBookings = 500

    // Clean up individual booking logs
    for (const [bookingId, logs] of this.bookingLogs.entries()) {
      if (logs.length > maxLogsPerBooking) {
        this.bookingLogs.set(bookingId, logs.slice(-maxLogsPerBooking))
      }
    }

    // Clean up old bookings
    if (this.bookingLogs.size > maxBookings) {
      const bookingIds = Array.from(this.bookingLogs.keys())
      const oldestBookings = bookingIds.slice(0, bookingIds.length - maxBookings)
      oldestBookings.forEach(id => this.bookingLogs.delete(id))
    }

    // Similar cleanup for session logs
    if (this.sessionLogs.size > maxBookings) {
      const sessionIds = Array.from(this.sessionLogs.keys())
      const oldestSessions = sessionIds.slice(0, sessionIds.length - maxBookings)
      oldestSessions.forEach(id => this.sessionLogs.delete(id))
    }
  }
}

export const bookingLogger = BookingLogger.getInstance()
export default bookingLogger 
