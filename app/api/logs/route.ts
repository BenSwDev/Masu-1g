import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prodLogger from "@/lib/logs/vercel-logger"

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
    const level = searchParams.get('level') as 'info' | 'warn' | 'error' | 'debug' | null
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    let logs

    if (level) {
      logs = prodLogger.getLogsByLevel(level, limit)
    } else if (userId) {
      logs = prodLogger.getLogsForUser(userId, limit)
    } else {
      logs = prodLogger.getRecentLogs(limit)
    }

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    })

  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}

// Stream logs in real-time
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // This would be for real-time log streaming
    // You could implement WebSocket or Server-Sent Events here
    
    return NextResponse.json({
      success: true,
      message: "Real-time logging endpoint - implement WebSocket or SSE"
    })

  } catch (error) {
    console.error("Error in logs POST:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 