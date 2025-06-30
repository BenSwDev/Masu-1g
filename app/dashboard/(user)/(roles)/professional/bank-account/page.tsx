import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

export default async function ProfessionalBankAccountPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">פרטי חשבון בנק</h1>
        <p className="text-gray-600">ניהול פרטי חשבון הבנק שלך.</p>
      </div>
    </div>
  )
}
