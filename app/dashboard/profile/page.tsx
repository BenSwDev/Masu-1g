import { ProfileForm } from "@/components/dashboard/profile/profile-form"
import { getUserProfile } from "@/actions/profile-actions"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const result = await getUserProfile()

  if (!result.success) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your personal information and preferences.</p>
      </div>

      <ProfileForm user={result.user} />
    </div>
  )
}
