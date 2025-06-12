import { getGuestBookingInitialData } from "@/actions/booking-actions"
import GuestBookingWizard from "@/components/guest/book-treatment/guest-booking-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"

export default async function GuestBookTreatmentPage() {
  try {
    const initialDataResult = await getGuestBookingInitialData()
    
    if (!initialDataResult?.success || !initialDataResult?.data) {
      console.error('Guest booking data fetch failed:', initialDataResult?.error)
      return (
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="container mx-auto py-8">
        <GuestBookingWizard
          initialData={initialDataResult.data}
        />
      </div>
    )
  } catch (error) {
    console.error('Error in guest book treatment page:', error)
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </div>
    )
  }
} 