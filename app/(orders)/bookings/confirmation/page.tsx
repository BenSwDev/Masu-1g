import { Suspense } from "react"
import { notFound } from "next/navigation"
import GuestBookingConfirmation from "@/components/booking/steps/guest-booking-confirmation"
import { getBookingById } from "@/actions/booking-actions"
import dbConnect from "@/lib/db/mongoose"

interface SearchParams {
  bookingId?: string
  status?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const { bookingId, status } = resolvedSearchParams

  if (!bookingId || status !== "success") {
    notFound()
  }

  await dbConnect()
  
  // Get booking data
  const bookingResult = await getBookingById(bookingId)
  
  if (!bookingResult.success || !bookingResult.booking) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <Suspense fallback={<div>טוען...</div>}>
          <GuestBookingConfirmation 
            bookingResult={bookingResult.booking}
            initialData={{
              activeTreatments: [],
              activeUserSubscriptions: [],
              usableGiftVouchers: [],
              userPreferences: {
                therapistGender: "any",
                notificationMethods: [],
                notificationLanguage: "he",
              },
              userAddresses: [],
              userPaymentMethods: [],
              workingHoursSettings: {},
              currentUser: {
                id: "",
                name: "",
                email: "",
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  )
} 