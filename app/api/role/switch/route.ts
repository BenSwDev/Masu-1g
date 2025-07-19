import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { revalidatePath } from "next/cache"

/**
 * API Route: POST /api/role/switch
 * Body: { role: string }
 * Switches the authenticated user's active role, if it exists in their roles array.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "notAuthenticated" }, { status: 401 })
    }

    const { role } = await request.json()
    if (!role || typeof role !== "string") {
      return NextResponse.json({ success: false, message: "invalidRole" }, { status: 400 })
    }

    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ success: false, message: "userNotFound" }, { status: 404 })
    }

    // Verify the requested role is assigned to the user
    if (!user.roles.includes(role)) {
      // Fallback to a safe active role so that the client can refresh gracefully
      const fallback = user.roles.includes("admin")
        ? "admin"
        : user.roles.includes("professional")
        ? "professional"
        : user.roles.includes("partner")
        ? "partner"
        : "member"
      user.activeRole = fallback
      await user.save()
      return NextResponse.json(
        { success: false, message: "roleNotAssigned", activeRole: fallback },
        { status: 400 },
      )
    }

    // Update activeRole
    user.activeRole = role
    await user.save()

    // Revalidate any paths that depend on active role
    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/${role}`)
    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/account")

    return NextResponse.json({ success: true, message: "activeRoleUpdated", activeRole: role })
  } catch (error) {
    console.error("Error setting active role via API:", error)
    return NextResponse.json({ success: false, message: "setActiveRoleFailed" }, { status: 500 })
  }
}