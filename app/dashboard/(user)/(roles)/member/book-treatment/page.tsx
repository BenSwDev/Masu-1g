import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import UniversalBookingWizard from "@/components/booking/guest-booking-wizard"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export default async function BookTreatmentPage({ params, searchParams }: { params?: Promise<{ lang?: string }>; searchParams?: Promise<{ category?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }
  const initialDataResult = await getBookingInitialData(session.user.id)
  if (!initialDataResult?.success || !initialDataResult?.data) {
    return null
  }
  
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  
  return (
    <UniversalBookingWizard
      initialData={initialDataResult.data}
      currentUser={session.user}
      initialCategory={resolvedSearchParams?.category}
    />
  )
}
