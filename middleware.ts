import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Track initialization status
let isInitialized = false
let isInitializing = false

async function initializeDataIfNeeded() {
  if (isInitialized || isInitializing) {
    return
  }

  isInitializing = true
  
  try {
    console.log("🚀 Starting automatic data initialization...")
    
    // Import and run initialization
    const { initializeData } = await import("@/scripts/init-data")
    await initializeData()
    
    isInitialized = true
    console.log("✅ Automatic data initialization completed")
  } catch (error) {
    console.error("❌ Automatic data initialization failed:", error)
    // Don't block the app if initialization fails
  } finally {
    isInitializing = false
  }
}

export default withAuth(
  async function middleware(req) {
    // Only run initialization once on first request
    if (!isInitialized && !isInitializing) {
      // Run initialization in background without blocking the request
      initializeDataIfNeeded().catch(console.error)
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

// Protect specific routes
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*"],
}
