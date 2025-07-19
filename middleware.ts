import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    
    // Redirect old professional creation route to the main list page
    if (pathname === "/dashboard/admin/professional-management/new") {
      return NextResponse.redirect(new URL("/dashboard/admin/professional-management", req.url))
    }
    
    // Check role-based access for dashboard routes
    if (pathname.startsWith("/dashboard/")) {
      const pathParts = pathname.split("/")
      const requestedRole = pathParts[2] // e.g., "admin", "member", "professional", "partner"
      
      // List of valid role paths
      const validRoles = ["admin", "member", "professional", "partner"]
      
      if (validRoles.includes(requestedRole)) {
        // Check if user has the requested role
        const userRoles = token?.roles || []
        const activeRole = token?.activeRole || "member"
        
        if (!userRoles.includes(requestedRole)) {
          // User doesn't have this role, redirect to their active role dashboard
          return NextResponse.redirect(new URL(`/dashboard/${activeRole}`, req.url))
        }
        
        // If accessing a different role than the active one, it's okay as long as they have the role
        // The UI will show the correct active role in the sidebar
      }
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
