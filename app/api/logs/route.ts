import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prodLogger from "@/lib/logs/vercel-logger"
import bookingLogger from "@/lib/logs/booking-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only admins can view logs
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'general' // 'general' | 'booking'
    const level = searchParams.get('level') as 'info' | 'warn' | 'error' | 'debug' | null
    const userId = searchParams.get('userId')
    const bookingId = searchParams.get('bookingId')
    const sessionId = searchParams.get('sessionId')
    const phase = searchParams.get('phase') as any
    const limit = parseInt(searchParams.get('limit') || '100')
    const format = searchParams.get('format') || 'json' // 'json' | 'text'

    let logs
    let summary = null

    if (type === 'booking') {
      // Booking-specific logs
      if (bookingId) {
        logs = bookingLogger.getBookingLogs(bookingId)
        summary = bookingLogger.generateBookingFlowSummary(bookingId)
      } else if (sessionId) {
        logs = bookingLogger.getSessionLogs(sessionId)
      } else if (phase) {
        logs = bookingLogger.getLogsByPhase(phase, limit)
      } else if (level === 'error') {
        logs = bookingLogger.getErrorLogs(limit)
      } else {
        logs = bookingLogger.getRecentBookingLogs(limit)
      }
    } else {
      // General logs
      if (level) {
        logs = prodLogger.getLogsByLevel(level, limit)
      } else if (userId) {
        logs = prodLogger.getLogsForUser(userId, limit)
      } else {
        logs = prodLogger.getRecentLogs(limit)
      }
    }

    if (format === 'text') {
      // Return logs as formatted text for easy copying
      const textLogs = logs.map((log: any) => {
        if (type === 'booking') {
          return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.phase || 'unknown'}] ${log.message}${
            log.bookingId ? ` (Booking: ${log.bookingId})` : ''
          }${
            log.error ? `\nError: ${JSON.stringify(log.error, null, 2)}` : ''
          }`
        } else {
          return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${
            log.context ? `\nContext: ${JSON.stringify(log.context, null, 2)}` : ''
          }`
        }
      }).join('\n\n')

      return new Response(textLogs, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="logs_${type}_${new Date().toISOString().split('T')[0]}.txt"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      logs,
      summary,
      total: logs.length,
      type,
      filters: {
        level,
        userId,
        bookingId,
        sessionId,
        phase,
        limit
      }
    })

  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}

// Stream logs in real-time or export logs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, bookingId, sessionId } = body

    if (action === 'export') {
      // Export logs to a downloadable format
      let logs
      if (bookingId) {
        logs = bookingLogger.getBookingLogs(bookingId)
      } else if (sessionId) {
        logs = bookingLogger.getSessionLogs(sessionId)
      } else {
        logs = bookingLogger.getRecentBookingLogs(1000)
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email,
        filters: { bookingId, sessionId },
        logs
      }

      return NextResponse.json({
        success: true,
        data: exportData,
        filename: `booking_logs_${bookingId || sessionId || 'all'}_${new Date().toISOString().split('T')[0]}.json`
      })
    }

    if (action === 'summary') {
      // Get booking flow summaries
      if (bookingId) {
        const summary = bookingLogger.generateBookingFlowSummary(bookingId)
        return NextResponse.json({
          success: true,
          summary
        })
      } else {
        // Get summaries for recent bookings
        const recentLogs = bookingLogger.getRecentBookingLogs(100)
        const bookingIds = [...new Set(recentLogs.map(log => log.bookingId).filter(Boolean))]
        const summaries = bookingIds.map(id => bookingLogger.generateBookingFlowSummary(id!))
        
        return NextResponse.json({
          success: true,
          summaries
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Invalid action"
    })

  } catch (error) {
    console.error("Error in logs POST:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 