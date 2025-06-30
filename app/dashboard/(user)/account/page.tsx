import { AccountForm } from "@/components/dashboard/account/account-form"
import { getUserProfile } from "@/actions/profile-actions"
import { redirect } from "next/navigation"
export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const result = await getUserProfile()

  if (!result.success || !result.user) {
    redirect("/auth/login")
  }

  // Convert dates to strings
  const user = {
    ...result.user,
    dateOfBirth: result.user.dateOfBirth?.toISOString(),
    createdAt: result.user.createdAt.toISOString(),
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">Manage your account security and contact information.</p>
      </div>

      <AccountForm user={user} />
    </div>
  )
}
