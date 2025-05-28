import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function AdminProfessionalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 rtl:text-right">ניהול בעלי מקצוע</h1>
        <p className="text-gray-600 rtl:text-right">ניהול וצפייה ברשימת בעלי המקצוע במערכת.</p>
      </div>
    </div>
  )
}
