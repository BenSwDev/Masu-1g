"use client"

import { CheckCircle, Calendar, Clock, Gift, Copy } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"

interface SubscriptionDetails {
  _id: string
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
}

interface TreatmentDetails {
  _id: string
  name: string
  description: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
}

interface DurationDetails {
  _id: string
  minutes: number
  price: number
}

interface Props {
  userSubscription: any | null
}

export default function GuestSubscriptionConfirmation({ userSubscription }: Props) {
  const { t, language, dir } = useTranslation()
  const { toast } = useToast()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "הועתק!",
        description: "קוד המנוי הועתק ללוח",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן להעתיק את הקוד",
      })
    }
  }

  if (!userSubscription) {
    return (
      <div className="text-center py-8" dir={dir} lang={language}>
        <p className="text-destructive">שגיאה בטעינת פרטי הרכישה</p>
      </div>
    )
  }

  const subscription = userSubscription.subscription
  const treatment = userSubscription.treatment
  const duration = userSubscription.duration
  const totalAmount = userSubscription.totalAmount
  const purchaseDate = userSubscription.purchaseDate
  const expiryDate = userSubscription.expiryDate
  const subscriptionCode = userSubscription.subscriptionCode

  const totalSessions = subscription.quantity + subscription.bonusQuantity

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6" dir={dir} lang={language}>
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">רכישת המנוי הושלמה בהצלחה!</h1>
        <p className="text-lg text-muted-foreground">תודה על רכישתך. המנוי שלך מוכן לשימוש</p>
      </div>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            פרטי המנוי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">שם המנוי:</span>
            <span>{subscription.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">תיאור:</span>
            <span>{subscription.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">כמות טיפולים:</span>
            <span>{subscription.quantity} טיפולים</span>
          </div>
          {subscription.bonusQuantity > 0 && (
            <div className="flex justify-between">
              <span className="font-medium">טיפולים במתנה:</span>
              <span>{subscription.bonusQuantity} טיפולים</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-medium">סה"כ טיפולים:</span>
            <span className="font-bold text-green-600">{totalSessions} טיפולים</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">תוקף המנוי:</span>
            <span>{subscription.validityMonths} חודשים</span>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            פרטי הטיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">שם הטיפול:</span>
            <span>{treatment.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">תיאור:</span>
            <span>{treatment.description}</span>
          </div>
          {duration && (
            <div className="flex justify-between">
              <span className="font-medium">משך טיפול:</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {duration.minutes} דקות
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-medium">מחיר לטיפול:</span>
            <span>
              {treatment.pricingType === "fixed" ? treatment.fixedPrice : duration?.price} ₪
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום רכישה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">תאריך רכישה:</span>
            <span>{purchaseDate.toLocaleDateString("he-IL")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">תוקף עד:</span>
            <span>{expiryDate.toLocaleDateString("he-IL")}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span>סה"כ לתשלום:</span>
              <span className="text-green-600">{totalAmount} ₪</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Code */}
      {subscriptionCode && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-green-900">קוד המנוי שלך</h3>
              <p className="text-sm text-green-700">
                השתמש בקוד הזה כדי למממש את המנוי בעת הזמנת טיפול
              </p>
              <div className="bg-white p-4 rounded border border-green-300 shadow-sm">
                <div className="font-mono text-2xl font-bold text-green-800 tracking-wider">
                  {subscriptionCode}
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => copyToClipboard(subscriptionCode)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  העתק קוד
                </Button>
                <Button asChild size="sm">
                  <Link href="/bookings/treatment">הזמן טיפול כעת</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/dashboard">לדשבורד</Link>
        </Button>
        <Button asChild>
          <Link href="/">חזרה לעמוד הבית</Link>
        </Button>
      </div>
    </div>
  )
}
