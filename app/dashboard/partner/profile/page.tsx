import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function PartnerProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "partner") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">פרופיל אישי</h1>
        <p className="text-gray-600">ניהול הפרופיל האישי שלך.</p>
      </div>
    </div>
  )
}
