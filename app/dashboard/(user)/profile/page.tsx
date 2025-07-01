import { ProfileForm } from "@/components/dashboard/profile/profile-form"
import { getUserProfile } from "@/actions/account-actions"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const result = await getUserProfile()

  if (!result.success || !result.user) {
    redirect("/auth/login")
  }

  // Convert dateOfBirth to string if it exists
  const user = {
    ...result.user,
    dateOfBirth: (result.user as any).dateOfBirth?.toISOString(),
    createdAt: result.user.createdAt.toISOString(),
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your personal information and preferences.</p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
