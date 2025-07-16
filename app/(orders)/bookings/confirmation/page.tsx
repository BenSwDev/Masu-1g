import { Suspense } from "react"
import { notFound } from "next/navigation"
import GuestBookingConfirmation from "@/components/booking/steps/guest-booking-confirmation"
import { getBookingById } from "@/actions/booking-actions"
import dbConnect from "@/lib/db/mongoose"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface SearchParams {
  bookingId?: string
  status?: string
  reason?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const { bookingId, status, reason } = resolvedSearchParams

  if (!bookingId || !status) {
    notFound()
  }

  // Handle failure case
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-red-700">
                  התשלום נכשל
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-gray-600">
                  <p className="mb-4">
                    מצטערים, אירעה שגיאה בביצוע התשלום והזמנתך לא הושלמה.
                  </p>
                  
                  {reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-right">
                          <p className="font-medium text-red-800">סיבת הכישלון:</p>
                          <p className="text-red-700 mt-1">{reason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">מה עכשיו?</h3>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• לא חויבת בשום סכום</li>
                      <li>• תוכלי לנסות שוב ולבצע הזמנה חדשה</li>
                      <li>• במקרה של בעיה חוזרת, צרי קשר עם שירות הלקוחות</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link href="/bookings/treatment">
                      נסי שוב
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/">
                      <ArrowLeft className="w-4 h-4 ml-2" />
                      חזרה לעמוד הבית
                    </Link>
                  </Button>
                </div>
                
                <div className="text-sm text-gray-500 border-t pt-4">
                  <p>נזקקת לעזרה? צרי קשר איתנו:</p>
                  <p className="font-medium mt-1">
                    📞 <span dir="ltr">03-1234567</span> | 
                    📧 support@masu.co.il
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Handle success case (existing logic)
  if (status !== "success") {
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
            bookingResult={bookingResult.booking as any}
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