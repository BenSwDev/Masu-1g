import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/notifications/email-service'

export async function GET() {
  try {
    const emailService = new EmailService()
    const status = emailService.getStatus()
    
    return NextResponse.json({
      success: true,
      status,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasEmailHost: !!process.env.EMAIL_SERVER_HOST,
        hasEmailPort: !!process.env.EMAIL_SERVER_PORT,
        hasEmailUser: !!process.env.EMAIL_SERVER_USER,
        hasEmailPassword: !!process.env.EMAIL_SERVER_PASSWORD,
        emailFrom: process.env.EMAIL_FROM
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    }, { status: 500 })
  }
} 
