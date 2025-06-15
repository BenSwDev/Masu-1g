import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import UnifiedBookingWizard from "@/components/booking/unified-booking-wizard"
import type { User } from "next-auth"

export default async function BookTreatmentPage({ params }: { params?: { lang?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }
  const initialDataResult = await getBookingInitialData(session.user.id)
  if (!initialDataResult?.success || !initialDataResult?.data) {
    return null
  }
  return (
    <UnifiedBookingWizard
      initialData={initialDataResult.data}
      currentUser={session.user as User}
    />
  )
}
