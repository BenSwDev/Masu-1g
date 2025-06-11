import { redirect } from "next/navigation"
import { BookingWizard } from "@/components/dashboard/member/book-treatment/booking-wizard"
import { getBookingInitialData } from "@/actions/booking-actions"

export default async function GuestBookTreatmentPage() {
  // Get guest user ID from server-side logic (we'll enhance this)
  const guestUserId = null // TODO: Get from session/cookies
  
  if (!guestUserId) {
    redirect("/")
  }

  try {
    const initialData = await getBookingInitialData(guestUserId)
    
    if (!initialData.success) {
      redirect("/")
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">הזמנת טיפול כאורח</h1>
            <p className="text-gray-600 mt-2">אנא מלא את הפרטים להזמנת הטיפול</p>
          </div>
          
          <BookingWizard 
            initialData={initialData.data!} 
            currentUser={initialData.data!.currentUser}
            isGuestMode={true}
          />
        </div>
      </div>
    )
  } catch (error) {
    redirect("/")
  }
} 