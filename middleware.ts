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
    // TODO: Remove debug log

    const res = await fetch(`${origin}/api/init`, { method: "POST" })

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || ""
      let body: string
      if (contentType.includes("application/json")) {
        try {
          body = JSON.stringify(await res.json())
        } catch {
          body = await res.text()
        }
      } else {
        const text = await res.text()
        body = text.length > 500 ? text.slice(0, 500) + "..." : text
      }
      console.error(`❌ Automatic data initialization failed (status ${res.status}):`, body)
    } else {
      isInitialized = true
      // TODO: Remove debug log
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
  }
)

// Protect specific routes
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*"],
}
