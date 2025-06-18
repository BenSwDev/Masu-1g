import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import type { UserSessionData } from "@/types/next-auth"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


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
    <BookingWizard
      initialData={initialDataResult.data}
      currentUser={session.user as UserSessionData}
    />
  )
}
