"use client"

import { CheckCircle, Calendar, Clock, Gift } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
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

export default function GuestSubscriptionConfirmation({ 
  userSubscription 
}: Props) {
  const { t, language, dir } = useTranslation()
  
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
  const redeemLink = userSubscription.redeemLink

  const totalSessions = subscription.quantity + subscription.bonusQuantity

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6" dir={dir} lang={language}>
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">רכישת המנוי הושלמה בהצלחה!</h1>
        <p className="text-lg text-muted-foreground">
          תודה על רכישתך. המנוי שלך מוכן לשימוש
        </p>
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
              {treatment.pricingType === "fixed" 
                ? treatment.fixedPrice 
                : duration?.price 
              } ₪
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
            <span>{purchaseDate.toLocaleDateString('he-IL')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">תוקף עד:</span>
            <span>{expiryDate.toLocaleDateString('he-IL')}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span>סה"כ לתשלום:</span>
              <span className="text-green-600">{totalAmount} ₪</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redeem Link (if available) */}
      {redeemLink && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-blue-900">קישור למימוש המנוי</h3>
              <p className="text-sm text-blue-700">
                שמור את הקישור הזה כדי למש את המנוי בעתיד
              </p>
              <div className="bg-white p-3 rounded border border-blue-300 font-mono text-sm break-all">
                {redeemLink}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={redeemLink} target="_blank">
                  מימוש המנוי כעת
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            לדשבורד
          </Link>
        </Button>
        <Button asChild>
          <Link href="/">
            חזרה לעמוד הבית
          </Link>
        </Button>
      </div>
    </div>
  )
} 