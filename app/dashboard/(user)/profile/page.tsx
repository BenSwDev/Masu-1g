import { ProfileForm } from "@/components/dashboard/profile/profile-form"
import { getUserProfile } from "@/actions/account-actions"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const result = await getUserProfile()

  if (!result.success || !result.user) {
    redirect("/auth/login")
  }

  const handleSubmit = async (values: any) => {
    // TODO: Implement profile update logic
    console.log("Profile update:", values)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your personal information and preferences.</p>
      </div>

      <ProfileForm 
        initialValues={{
          name: result.user.name || "",
          email: result.user.email || "",
          phone: result.user.phone || "",
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
