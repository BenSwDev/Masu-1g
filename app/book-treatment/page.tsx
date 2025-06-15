import { Suspense } from "react"
import { getBookingInitialData } from "@/actions/booking-actions"
import UnifiedBookingWizard from "@/components/booking/unified-booking-wizard"
import { logger } from "@/lib/logs/logger"

export const dynamic = 'force-dynamic'

export default async function BookTreatmentPage() {
  try {
    const initialDataResult = await getBookingInitialData()
    
    if (!initialDataResult.success || !initialDataResult.data) {
      logger.error("Guest booking data fetch failed", { 
        error: initialDataResult.error 
      })
      
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה בטעינת הנתונים</h1>
            <p className="text-muted-foreground">
              {initialDataResult.error || "אירעה שגיאה בטעינת נתוני ההזמנה"}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>טוען...</div>}>
          <UnifiedBookingWizard 
            initialData={initialDataResult.data}
            // No currentUser for guest booking
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    logger.error("Error in guest book treatment page", { error })
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h1>
          <p className="text-muted-foreground">אירעה שגיאה בלתי צפויה. אנא נסה שוב מאוחר יותר.</p>
        </div>
      </div>
    )
  }
} 