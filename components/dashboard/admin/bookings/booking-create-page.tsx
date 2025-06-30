"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Import creation steps
import BookingCreateCustomerStep from "./create-steps/booking-create-customer-step"
import BookingCreateTreatmentStep from "./create-steps/booking-create-treatment-step"
import BookingCreateSchedulingStep from "./create-steps/booking-create-scheduling-step"
import BookingCreateAddressStep from "./create-steps/booking-create-address-step"
import BookingCreatePaymentStep from "./create-steps/booking-create-payment-step"
import BookingCreateConfirmationStep from "./create-steps/booking-create-confirmation-step"

interface BookingCreatePageProps {
  initialData: {
    treatments: any[]
    paymentMethods: any[]
    workingHours: any
    activeCoupons: any[]
    activeGiftVouchers: any[]
  }
}

interface BookingFormData {
  // Customer info
  customerType: "guest" | "existing"
  guestInfo?: {
    firstName: string
    lastName: string
    email: string
    phone: string
    birthDate?: Date
    gender?: "male" | "female" | "other"
  }
  existingCustomerId?: string
  isBookingForSomeoneElse: boolean
  recipientInfo?: {
    firstName: string
    lastName: string
    email: string
    phone: string
    birthDate?: Date
    gender?: "male" | "female" | "other"
  }

  // Treatment selection
  treatmentId?: string
  selectedDurationId?: string

  // Scheduling
  bookingDateTime?: Date
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  therapistGenderPreference: "male" | "female" | "any"

  // Address
  addressType: "existing" | "custom"
  addressId?: string
  customAddress?: {
    city: string
    street: string
    houseNumber: string
    apartmentNumber?: string
    floor?: string
    entrance?: string
    notes?: string
    parking: boolean
  }

  // Payment
  paymentType: "immediate" | "cash" | "invoice"
  paymentMethodId?: string
  appliedCouponCode?: string
  appliedGiftVoucherId?: string
  redeemedSubscriptionId?: string

  // Additional
  notes?: string
  notificationPreferences: {
    customerMethod: "email" | "sms" | "both" | "none"
    recipientMethod: "email" | "sms" | "both" | "none"
  }
}

const TOTAL_STEPS = 6
const STEP_NAMES = ["לקוח", "טיפול", "תזמון", "כתובת", "תשלום", "אישור"]

export function BookingCreatePage({ initialData }: BookingCreatePageProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<BookingFormData>({
    customerType: "guest",
    isBookingForSomeoneElse: false,
    therapistGenderPreference: "any",
    addressType: "custom",
    paymentType: "immediate",
    isFlexibleTime: false,
    notificationPreferences: {
      customerMethod: "email",
      recipientMethod: "email",
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedPrice, setCalculatedPrice] = useState<any>(null)

  const handleUpdateFormData = (updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleBack = () => {
    router.push("/dashboard/admin/bookings")
  }

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleCreateBooking = async () => {
    setIsLoading(true)
    try {
      // Here we would call the create booking API
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast({
        title: "הצלחה",
        description: "ההזמנה נוצרה בהצלחה",
      })

      router.push("/dashboard/admin/bookings")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ביצירת ההזמנה",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BookingCreateCustomerStep
            formData={formData}
            onUpdate={handleUpdateFormData}
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <BookingCreateTreatmentStep
            formData={formData}
            onUpdate={handleUpdateFormData}
            treatments={initialData.treatments}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <BookingCreateSchedulingStep
            formData={formData}
            onUpdate={handleUpdateFormData}
            workingHours={initialData.workingHours}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 4:
        return (
          <BookingCreateAddressStep
            formData={formData}
            onUpdate={handleUpdateFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 5:
        return (
          <BookingCreatePaymentStep
            formData={formData}
            onUpdate={handleUpdateFormData}
            paymentMethods={initialData.paymentMethods}
            activeCoupons={initialData.activeCoupons}
            activeGiftVouchers={initialData.activeGiftVouchers}
            calculatedPrice={calculatedPrice}
            onCalculatePrice={setCalculatedPrice}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 6:
        return (
          <BookingCreateConfirmationStep
            formData={formData}
            calculatedPrice={calculatedPrice}
            onConfirm={handleCreateBooking}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6" />
              יצירת הזמנה חדשה
            </h1>
            <p className="text-muted-foreground mt-1">
              שלב {currentStep} מתוך {TOTAL_STEPS}: {STEP_NAMES[currentStep - 1]}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>התקדמות</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </div>
  )
}
