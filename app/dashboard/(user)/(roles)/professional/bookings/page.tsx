import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Metadata } from "next"
import ProfessionalBookingsDashboard from "@/components/dashboard/professional/professional-bookings-dashboard"
import { getProfessionalProfile } from "@/actions/professional-actions"

export const metadata: Metadata = {
  title: "הזמנות המטפל | מסו",
  description: "דשבורד ההזמנות של המטפל"
}

export default async function ProfessionalBookingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    redirect("/auth/signin")
  }

  // קבלת פרטי המטפל
  const professionalResult = await getProfessionalProfile(session.user.id)
  
  if (!professionalResult.success) {
    redirect("/dashboard/professional")
  }

  const professionalName = professionalResult.data?.userId?.name || "מטפל"

  return (
    <div className="container mx-auto p-6">
      <ProfessionalBookingsDashboard
        professionalId={session.user.id}
        professionalName={professionalName}
      />
    </div>
  )
} 