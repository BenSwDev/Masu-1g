import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Track initialization status
let isInitialized = false
let isInitializing = false

async function initializeDataIfNeeded(origin: string) {
  if (isInitialized || isInitializing) {
    return
  }

  isInitializing = true

  try {
    console.log("🚀 Starting automatic data initialization via API...")

    const res = await fetch(`${origin}/api/init`, { method: "POST" })

    if (!res.ok) {
      console.error(
        "❌ Automatic data initialization failed:",
        await res.text()
      )
    } else {
      isInitialized = true
      console.log("✅ Automatic data initialization completed")
    }
  } catch (error) {
    console.error("❌ Automatic data initialization failed:", error)
  } finally {
    isInitializing = false
  }
}

export default withAuth(
  async function middleware(req) {
    // Only run initialization once on first request
    if (!isInitialized && !isInitializing) {
      // Run initialization in background without blocking the request
      initializeDataIfNeeded(req.nextUrl.origin).catch(console.error)
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
