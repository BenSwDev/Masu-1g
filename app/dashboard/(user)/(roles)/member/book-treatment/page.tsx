import { getBookingInitialData } from "@/actions/booking-actions"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"

export default async function BookTreatmentPage() {
  const initialData = await getBookingInitialData()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Book a Treatment</h1>
      <BookingWizard initialData={initialData} />
    </div>
  )
}
