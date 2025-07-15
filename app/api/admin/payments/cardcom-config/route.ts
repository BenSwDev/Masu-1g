import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { cardcomService } from "@/lib/services/cardcom-service"
import { logger } from "@/lib/logs/logger"

// Get current CARDCOM configuration
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const status = cardcomService.getStatus()
    
    return NextResponse.json({
      success: true,
      config: status
    })
  } catch (error) {
    logger.error("Error getting CARDCOM config", {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { success: false, error: "Failed to get configuration" },
      { status: 500 }
    )
  }
}

// Update CARDCOM test mode
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { testMode } = body

    if (typeof testMode !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "testMode must be a boolean" },
        { status: 400 }
      )
    }

    // Update test mode
    cardcomService.setTestMode(testMode)
    
    logger.info("CARDCOM test mode updated by admin", {
      adminId: session.user.id,
      adminEmail: session.user.email,
      testMode
    })

    return NextResponse.json({
      success: true,
      message: `CARDCOM ${testMode ? 'TEST' : 'PRODUCTION'} mode activated`,
      config: cardcomService.getStatus()
    })
  } catch (error) {
    logger.error("Error updating CARDCOM config", {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { success: false, error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}

// Test CARDCOM connection
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info("Testing CARDCOM connection", {
      adminId: session.user.id,
      adminEmail: session.user.email
    })

    const result = await cardcomService.testConnection()
    
    if (result.success) {
      logger.info("CARDCOM connection test successful")
      return NextResponse.json({
        success: true,
        message: "Connection to CARDCOM successful",
        config: cardcomService.getStatus()
      })
    } else {
      logger.error("CARDCOM connection test failed", { error: result.error })
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error("Error testing CARDCOM connection", {
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { success: false, error: "Failed to test connection" },
      { status: 500 }
    )
  }
} 