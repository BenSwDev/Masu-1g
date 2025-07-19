import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import ProfessionalPotentialBookingsClient from "./professional-potential-bookings-client"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import dbConnect from "@/lib/db/mongoose"
import { Card, CardContent } from "@/components/common/ui/card"
import { Target } from "lucide-react"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export default async function ProfessionalPotentialBookingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  // טוען את פרופיל המטפל
  let professionalProfile = null
  try {
    await dbConnect()
    const profile = await ProfessionalProfile.findOne({ 
      userId: session.user.id,
      status: 'active'
    }).lean()
    
    if (profile) {
      professionalProfile = {
        _id: profile._id.toString(),
        userId: profile.userId.toString(),
        status: profile.status,
        isActive: profile.isActive,
        workAreas: profile.workAreas || [],
        treatments: profile.treatments || []
      }
    }
  } catch (error) {
    console.error("Error loading professional profile:", error)
  }

  if (!professionalProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
          <div className="bg-orange-100 p-3 rounded-lg">
            <Target className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הזמנות פוטנציאליות</h1>
            <p className="text-gray-600">הזמנות שמתאימות לך ועדיין מחכות למטפל</p>
          </div>
        </div>
      </div>

      <ProfessionalPotentialBookingsClient professional={professionalProfile} />
    </div>
  )
} 