import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    // Redirect old professional creation route to the main list page
    if (req.nextUrl.pathname === "/dashboard/admin/professional-management/new") {
      return NextResponse.redirect(new URL("/dashboard/admin/professional-management", req.url))
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
