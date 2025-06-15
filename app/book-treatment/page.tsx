import { getBookingInitialData } from "@/actions/booking-actions"
import UnifiedBookingWizard from "@/components/booking/unified-booking-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

export default async function GuestBookTreatmentPage() {
  try {
    const initialDataResult = await getBookingInitialData() // No userId for guests
    
    if (!initialDataResult?.success || !initialDataResult?.data) {
      console.error('Guest booking data fetch failed:', initialDataResult?.error)
      return (
        <GuestLayout>
          <Card>
            <CardHeader>
              <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
            </CardContent>
          </Card>
        </GuestLayout>
      )
    }

    return (
      <GuestLayout>
        <UnifiedBookingWizard
          initialData={initialDataResult.data}
        />
      </GuestLayout>
    )
  } catch (error) {
    console.error('Error in guest book treatment page:', error)
    return (
      <GuestLayout>
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }
} 