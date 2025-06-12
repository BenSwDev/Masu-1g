"use client"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails, TimeSlot } from "@/types/booking"
import { useToast } from "@/components/common/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Textarea } from "@/components/common/ui/textarea"
import { Progress } from "@/components/common/ui/progress"
import { AlertCircle, User, Mail, Phone, Bell } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"

import GuestTreatmentSelection from "./guest-treatment-selection"
import SchedulingStep from "@/components/dashboard/member/book-treatment/steps/scheduling-step"

import { createGuestBooking, getAvailableTimeSlots } from "@/actions/booking-actions"
import type { CreateBookingPayloadType, CalculatePricePayloadType } from "@/lib/validation/booking-schemas"
import type { IBooking } from "@/lib/db/models/booking"

// Guest information schema
const guestInfoSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות"),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
  }),
})

// Address schema for guest booking
const addressSchema = z.object({
  city: z.string().min(2, "עיר חייבת להכיל לפחות 2 תווים"),
  street: z.string().min(2, "רחוב חייב להכיל לפחות 2 תווים"),
  streetNumber: z.string().optional(),
  apartment: z.string().optional(),
  entrance: z.string().optional(),
  floor: z.string().optional(),
  notes: z.string().optional(),
})

type GuestInfo = z.infer<typeof guestInfoSchema>
type AddressInfo = z.infer<typeof addressSchema>

interface GuestBookingWizardProps {
  initialData: BookingInitialData
}

const TOTAL_STEPS = 5
const CONFIRMATION_STEP_NUMBER = TOTAL_STEPS + 1

const TIMEZONE = "Asia/Jerusalem"

export default function GuestBookingWizard({ initialData }: GuestBookingWizardProps) {
  const { t, language, dir } = useTranslation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceCalculating, setIsPriceCalculating] = useState(false)
  
  const [bookingOptions, setBookingOptions] = useState<Partial<SelectedBookingOptions>>({
    therapistGenderPreference: "any",
    isFlexibleTime: false,
    source: "new_purchase", // Guests can only make new purchases
  })
  
  const [calculatedPrice, setCalculatedPrice] = useState<CalculatedPriceDetails | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isTimeSlotsLoading, setIsTimeSlotsLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<IBooking | null>(null)
  const [workingHoursNote, setWorkingHoursNote] = useState<string | undefined>(undefined)

  const { toast } = useToast()

  // Guest info form
  const guestForm = useForm<GuestInfo>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notificationPreferences: {
        email: true,
        sms: false,
      },
    },
  })

  // Address form
  const addressForm = useForm<AddressInfo>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      city: "",
      street: "",
      streetNumber: "",
      apartment: "",
      entrance: "",
      floor: "",
      notes: "",
    },
  })

  // Effect to fetch time slots
  useEffect(() => {
    if (bookingOptions.bookingDate && bookingOptions.selectedTreatmentId) {
      const fetchSlots = async () => {
        setIsTimeSlotsLoading(true)
        setTimeSlots([])
        setWorkingHoursNote(undefined)
        
        const localDate = bookingOptions.bookingDate!
        const year = localDate.getFullYear()
        const month = (localDate.getMonth() + 1).toString().padStart(2, "0")
        const day = localDate.getDate().toString().padStart(2, "0")
        const dateStr = `${year}-${month}-${day}`
        
        const result = await getAvailableTimeSlots(
          dateStr,
          bookingOptions.selectedTreatmentId!,
          bookingOptions.selectedDurationId,
        )
        if (result.success) {
          setTimeSlots(result.timeSlots || [])
          setWorkingHoursNote(result.workingHoursNote)
        } else {
          toast({
            variant: "destructive",
            title: t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle") || "שגיאה",
            description: t(result.error || "bookings.errors.fetchTimeSlotsFailedTitle"),
          })
        }
        setIsTimeSlotsLoading(false)
      }
      fetchSlots()
    } else {
      setTimeSlots([])
      setWorkingHoursNote(undefined)
    }
  }, [bookingOptions.bookingDate, bookingOptions.selectedTreatmentId, bookingOptions.selectedDurationId, toast, t])

  // Auto-select first available time slot
  useEffect(() => {
    if (timeSlots.length > 0 && !bookingOptions.bookingTime) {
      const firstAvailableSlot = timeSlots.find((slot) => slot.isAvailable)
      if (firstAvailableSlot) {
        setBookingOptions((prev) => ({
          ...prev,
          bookingTime: firstAvailableSlot.time,
        }))
      }
    }
  }, [timeSlots, bookingOptions.bookingTime])

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const handleFinalSubmit = async () => {
    if (!guestForm.formState.isValid || !addressForm.formState.isValid) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא מלא את כל הפרטים הנדרשים",
      })
      return
    }

    setIsLoading(true)
    try {
      const guestInfo = guestForm.getValues()
      const addressInfo = addressForm.getValues()
      
      // Create booking date time
      const bookingDateTime = new Date(bookingOptions.bookingDate!)
      const [hours, minutes] = bookingOptions.bookingTime!.split(":").map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)

      // Construct full address
      const fullAddress = `${addressInfo.street} ${addressInfo.streetNumber || ""}, ${addressInfo.city}`.trim()

      const payload: CreateBookingPayloadType & {
        guestInfo: {
          name: string
          email: string
          phone: string
        }
      } = {
        treatmentId: bookingOptions.selectedTreatmentId!,
        selectedDurationId: bookingOptions.selectedDurationId,
        bookingDateTime,
        therapistGenderPreference: bookingOptions.therapistGenderPreference!,
        isFlexibleTime: bookingOptions.isFlexibleTime || false,
        flexibilityRangeHours: bookingOptions.flexibilityRangeHours,
        notes: bookingOptions.notes || "",
        source: "new_purchase",
        customAddressDetails: {
          fullAddress,
          city: addressInfo.city,
          street: addressInfo.street,
          streetNumber: addressInfo.streetNumber,
          apartment: addressInfo.apartment,
          entrance: addressInfo.entrance,
          floor: addressInfo.floor,
          notes: addressInfo.notes,
        },
        recipientName: guestInfo.name,
        recipientPhone: guestInfo.phone,
        recipientEmail: guestInfo.email,
        priceDetails: {
          basePrice: 0, // Will be calculated by server
          surcharges: [],
          totalSurchargesAmount: 0,
          treatmentPriceAfterSubscriptionOrTreatmentVoucher: 0,
          discountAmount: 0,
          voucherAppliedAmount: 0,
          finalAmount: 0, // Will be calculated by server
        },
        paymentDetails: {
          paymentStatus: "pending" as const,
          transactionId: `guest_${Date.now()}`,
        },
        guestInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      }

      const result = await createGuestBooking(payload)
      
      if (result.success && result.booking) {
        setBookingResult(result.booking)
        setCurrentStep(CONFIRMATION_STEP_NUMBER)
        toast({
          title: "ההזמנה נוצרה בהצלחה!",
          description: `מספר הזמנה: ${result.booking.bookingNumber}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת ההזמנה",
          description: result.error || "אירעה שגיאה לא צפויה",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת ההזמנה",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return bookingOptions.selectedTreatmentId
      case 2:
        return bookingOptions.bookingDate && bookingOptions.bookingTime
      case 3:
        return guestForm.formState.isValid
      case 4:
        return addressForm.formState.isValid
      default:
        return true
    }
  }

  const renderGuestInfoStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          פרטים אישיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">שם מלא *</Label>
          <Input
            id="name"
            {...guestForm.register("name")}
            placeholder="הכנס את שמך המלא"
          />
          {guestForm.formState.errors.name && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email">כתובת אימייל *</Label>
          <Input
            id="email"
            type="email"
            {...guestForm.register("email")}
            placeholder="example@email.com"
          />
          {guestForm.formState.errors.email && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">מספר טלפון *</Label>
          <Input
            id="phone"
            {...guestForm.register("phone")}
            placeholder="050-1234567"
          />
          {guestForm.formState.errors.phone && (
            <p className="text-red-500 text-sm mt-1">{guestForm.formState.errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            העדפות התראות
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailNotif"
                checked={guestForm.watch("notificationPreferences.email")}
                onCheckedChange={(checked) =>
                  guestForm.setValue("notificationPreferences.email", checked as boolean)
                }
              />
              <Label htmlFor="emailNotif" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                קבלת התראות באימייל
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="smsNotif"
                checked={guestForm.watch("notificationPreferences.sms")}
                onCheckedChange={(checked) =>
                  guestForm.setValue("notificationPreferences.sms", checked as boolean)
                }
              />
              <Label htmlFor="smsNotif" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                קבלת התראות ב-SMS
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderAddressStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>כתובת לטיפול</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">עיר *</Label>
            <Input
              id="city"
              {...addressForm.register("city")}
              placeholder="תל אביב"
            />
            {addressForm.formState.errors.city && (
              <p className="text-red-500 text-sm mt-1">{addressForm.formState.errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="street">רחוב *</Label>
            <Input
              id="street"
              {...addressForm.register("street")}
              placeholder="דיזנגוף"
            />
            {addressForm.formState.errors.street && (
              <p className="text-red-500 text-sm mt-1">{addressForm.formState.errors.street.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="streetNumber">מספר בית</Label>
            <Input
              id="streetNumber"
              {...addressForm.register("streetNumber")}
              placeholder="123"
            />
          </div>

          <div>
            <Label htmlFor="apartment">דירה</Label>
            <Input
              id="apartment"
              {...addressForm.register("apartment")}
              placeholder="4"
            />
          </div>

          <div>
            <Label htmlFor="entrance">כניסה</Label>
            <Input
              id="entrance"
              {...addressForm.register("entrance")}
              placeholder="א'"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="floor">קומה</Label>
          <Input
            id="floor"
            {...addressForm.register("floor")}
            placeholder="2"
          />
        </div>

        <div>
          <Label htmlFor="notes">הערות נוספות</Label>
          <Textarea
            id="notes"
            {...addressForm.register("notes")}
            placeholder="הוראות גישה, קוד דלת, וכו'"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  )

  const renderConfirmation = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-green-600">ההזמנה נוצרה בהצלחה!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookingResult && (
          <>
            <div className="text-center">
              <p className="text-lg font-semibold">מספר הזמנה: {bookingResult.bookingNumber}</p>
              <p className="text-gray-600">פרטי ההזמנה נשלחו אליך באימייל</p>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">פרטי ההזמנה:</h3>
              <p>תאריך: {format(new Date(bookingResult.bookingDateTime), "dd/MM/yyyy HH:mm")}</p>
              <p>שם: {bookingResult.bookedByUserName}</p>
              <p>אימייל: {bookingResult.bookedByUserEmail}</p>
              <p>טלפון: {bookingResult.bookedByUserPhone}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderStep = () => {
    if (currentStep === CONFIRMATION_STEP_NUMBER) {
      return renderConfirmation()
    }

    switch (currentStep) {
      case 1:
        return (
          <GuestTreatmentSelection
            treatments={initialData.treatments}
            bookingOptions={bookingOptions}
            setBookingOptions={(newOptions) => setBookingOptions(prev => ({ ...prev, ...newOptions }))}
          />
        )
      case 2:
        return (
          <SchedulingStep
            bookingOptions={bookingOptions}
            setBookingOptions={setBookingOptions}
            timeSlots={timeSlots}
            isLoading={isTimeSlotsLoading}
            workingHours={initialData.workingHours}
            workingHoursNote={workingHoursNote}
          />
        )
      case 3:
        return renderGuestInfoStep()
      case 4:
        return renderAddressStep()
      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>סיכום ההזמנה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>אנא בדוק את פרטי ההזמנה לפני האישור הסופי</p>
                <Button 
                  onClick={handleFinalSubmit} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "יוצר הזמנה..." : "אשר והזמן"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">הזמנת טיפול</h1>
        <p className="text-gray-600 mt-2">הזמן טיפול בבית בקלות ובמהירות</p>
      </div>

      <Progress value={progress} className="mb-8" />

      <div className="mb-8">
        {renderStep()}
      </div>

      {currentStep < CONFIRMATION_STEP_NUMBER && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            חזור
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceedToNextStep() || currentStep === TOTAL_STEPS}
          >
            {currentStep === TOTAL_STEPS ? "סיום" : "המשך"}
          </Button>
        </div>
      )}
    </div>
  )
} 