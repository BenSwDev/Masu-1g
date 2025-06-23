import { Suspense } from "react"
import { notFound } from "next/navigation"
import { handleProfessionalResponse } from "@/actions/notification-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface PageProps {
  params: {
    responseId: string
  }
  searchParams: {
    action?: "accept" | "decline"
  }
}

async function ResponseHandler({ responseId, action }: { responseId: string; action?: "accept" | "decline" }) {
  if (!action) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            תגובה להזמנה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            אנא בחר את התגובה שלך להזמנה:
          </p>
          <div className="flex flex-col gap-3">
            <Button 
              asChild
              className="bg-green-600 hover:bg-green-700"
            >
              <a href={`/professional/booking-response/${responseId}?action=accept`}>
                <CheckCircle className="h-4 w-4 mr-2" />
                אקבל את ההזמנה
              </a>
            </Button>
            <Button 
              asChild
              variant="destructive"
            >
              <a href={`/professional/booking-response/${responseId}?action=decline`}>
                <XCircle className="h-4 w-4 mr-2" />
                אדחה את ההזמנה
              </a>
            </Button>
          </div>
          <div className="text-center">
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Process the response
  const result = await handleProfessionalResponse(responseId, action, "sms")

  if (result.success) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {action === "accept" ? "ההזמנה נקבלה!" : "ההזמנה נדחתה"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {result.message}
          </p>
          {action === "accept" && (
            <div className="text-center">
              <Button asChild>
                <a href="/dashboard/professional/booking-management">
                  צפייה בהזמנות שלי
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  } else {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            שגיאה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {result.error}
          </p>
          <div className="text-center">
            <Button asChild variant="outline">
              <a href="/dashboard/professional/booking-management">
                כניסה לאפליקציה
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}

export default function ProfessionalResponsePage({ params, searchParams }: PageProps) {
  const { responseId } = params
  const { action } = searchParams

  if (!responseId) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">מאסו - מערכת ניהול הזמנות</h1>
          <p className="text-gray-600 mt-2">תגובה להזמנת טיפול</p>
        </div>
        
        <Suspense fallback={
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        }>
          <ResponseHandler responseId={responseId} action={action} />
        </Suspense>
      </div>
    </div>
  )
} 