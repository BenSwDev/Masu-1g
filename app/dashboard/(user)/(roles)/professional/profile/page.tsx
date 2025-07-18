import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import ProfessionalProfileClient from "./professional-profile-client"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import User from "@/lib/db/models/user"
import dbConnect from "@/lib/db/mongoose"
import { Card, CardContent } from "@/components/common/ui/card"
import { User as UserIcon } from "lucide-react"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export default async function ProfessionalProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  // טוען את פרופיל המטפל והמשתמש
  let professionalData = null
  try {
    await dbConnect()
    
    // Load user details
    const user = await User.findById(session.user.id).lean()
    if (!user) {
      throw new Error("User not found")
    }

    // Load professional profile
    const profile = await ProfessionalProfile.findOne({ 
      userId: session.user.id,
      status: 'active'
    }).lean()
    
    if (profile) {
      professionalData = {
        _id: profile._id.toString(),
        userId: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        },
        status: profile.status,
        isActive: profile.isActive,
        genderPreference: profile.genderPreference,
        appliedAt: profile.appliedAt,
        lastActiveAt: profile.lastActiveAt,
        updatedAt: profile.updatedAt
      }
    }
  } catch (error) {
    console.error("Error loading professional profile:", error)
  }

  if (!professionalData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">פרופיל מטפל לא נמצא</h2>
            <p className="text-gray-600">
              אנא צור קשר עם המנהל כדי להגדיר את הפרופיל שלך
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <UserIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הפרופיל שלי</h1>
            <p className="text-gray-600">עדכן את הפרטים האישיים והעדפות שלך</p>
          </div>
        </div>
      </div>

      <ProfessionalProfileClient professional={professionalData} />
    </div>
  )
}
