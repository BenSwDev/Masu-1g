"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"

interface BookingInitialData {
  treatmentId: string
  treatmentName: string
  duration: number
}

interface UserSessionData {
  id: string
  name: string
  email: string
}

interface BookingWizardProps {
  initialData: BookingInitialData
  currentUser: UserSessionData
}

interface Step {
  id: string
  label: string
  component: (props: any) => ReactNode
}

interface BookingWizardStepProps {
  initialData: BookingInitialData
  currentUser: UserSessionData
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const BookingWizard = ({ initialData, currentUser }: BookingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState<any>({})
  const { t, language } = useTranslation()

  const steps: Step[] = [
    {
      id: "treatment",
      label: t("bookings.wizard.treatment"),
      component: TreatmentStep,
    },
    {
      id: "date-time",
      label: t("bookings.wizard.dateTime"),
      component: DateTimeStep,
    },
    {
      id: "confirmation",
      label: t("bookings.wizard.confirmation"),
      component: ConfirmationStep,
    },
  ]

  const StepComponent = steps[currentStep - 1].component

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    // Simulate booking completion
    try {
      // Replace this with your actual booking logic
      const bookingResult = await new Promise((resolve) =>
        setTimeout(() => {
          resolve({ success: true })
        }, 1000),
      )

      if (bookingResult && (bookingResult as any).success) {
        toast({
          title: t("bookings.success.title"),
          description: t("bookings.success.description"),
        })
      } else {
        toast({
          title: t("bookings.errors.bookingFailedTitle"),
          description: t("bookings.errors.bookingFailed"),
        })
      }
    } catch (error: any) {
      toast({
        title: t("bookings.errors.bookingFailedTitle"),
        description: error?.message || t("bookings.errors.bookingFailed"),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookings.wizard.title")}</CardTitle>
        <CardDescription>{t("bookings.wizard.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{`${t("common.step")} ${currentStep} ${t("common.of")} ${steps.length}`}</p>
        </div>
        <StepComponent
          initialData={initialData}
          currentUser={currentUser}
          onNext={handleNext}
          onBack={handleBack}
          onComplete={handleComplete}
          bookingData={bookingData}
          setBookingData={setBookingData}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          {t("common.back")}
        </Button>
        {currentStep < steps.length ? (
          <Button onClick={handleNext}>{t("common.next")}</Button>
        ) : (
          <Button onClick={handleComplete}>{t("bookings.wizard.completeBooking")}</Button>
        )}
      </CardFooter>
    </Card>
  )
}

interface TreatmentStepProps extends BookingWizardStepProps {}

const TreatmentStep = ({ initialData, currentUser, onNext, bookingData, setBookingData }: TreatmentStepProps) => {
  const { t } = useTranslation()
  useEffect(() => {
    setBookingData((prev: any) => ({ ...prev, treatment: initialData }))
  }, [initialData, setBookingData])

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t("bookings.wizard.treatmentDetails")}</h2>
      <p>
        {t("bookings.wizard.treatmentName")}: {initialData.treatmentName}
      </p>
      <p>
        {t("bookings.wizard.duration")}: {initialData.duration} minutes
      </p>
    </div>
  )
}

interface DateTimeStepProps extends BookingWizardStepProps {
  setBookingData: (data: any) => void
  bookingData: any
}

const DateTimeStep = ({ initialData, currentUser, onNext, onBack, bookingData, setBookingData }: DateTimeStepProps) => {
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    // Simulate fetching available times
    const fetchAvailableTimes = async () => {
      try {
        const result = await new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              success: true,
              times: ["10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"],
            })
          }, 500),
        )

        if (result && (result as any).success) {
          setAvailableTimes((result as any).times)
        } else {
          toast({
            variant: "destructive",
            title: t(
              (result as any).error || "bookings.errors.fetchTimeSlotsFailedTitle",
              (result as any).error || t("common.error", "Error"),
            ),
            description: (result as any).error
              ? t((result as any).error, String((result as any).error))
              : t("bookings.errors.fetchTimeSlotsFailedTitle"),
          })
        }
      } catch (error: any) {
        toast({
          title: t("bookings.errors.fetchTimeSlotsFailedTitle"),
          description: (error as any)?.response?.data?.error
            ? t((error as any)?.response?.data?.error) !== (error as any)?.response?.data?.error
              ? t((error as any)?.response?.data?.error)
              : String((error as any)?.response?.data?.error)
            : t("bookings.errors.fetchTimeSlotsFailed"),
        })
      }
    }

    fetchAvailableTimes()
  }, [])

  const handleTimeSelection = (time: string) => {
    setBookingData((prev: any) => ({ ...prev, time }))
    onNext()
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t("bookings.wizard.selectDateTime")}</h2>
      {availableTimes.length > 0 ? (
        <div className="flex gap-2">
          {availableTimes.map((time) => (
            <Button key={time} onClick={() => handleTimeSelection(time)}>
              {time}
            </Button>
          ))}
        </div>
      ) : (
        <p>{t("bookings.wizard.loadingTimes")}</p>
      )}
    </div>
  )
}

interface ConfirmationStepProps extends BookingWizardStepProps {
  bookingData: any
}

const ConfirmationStep = ({ initialData, currentUser, onComplete, bookingData }: ConfirmationStepProps) => {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t("bookings.wizard.confirmBooking")}</h2>
      <p>
        {t("bookings.wizard.treatmentName")}: {initialData.treatmentName}
      </p>
      <p>
        {t("bookings.wizard.duration")}: {initialData.duration} minutes
      </p>
      <p>
        {t("bookings.wizard.selectedTime")}: {bookingData.time}
      </p>
    </div>
  )
}

export default BookingWizard
