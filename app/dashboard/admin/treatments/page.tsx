import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"

export default async function AdminTreatmentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ניהול טיפולים</h1>
        <p className="text-gray-600">ניהול וצפייה ברשימת הטיפולים במערכת.</p>
      </div>

      <TreatmentsClient />
    </div>
  )
}
