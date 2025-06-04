"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { BookingInitialData, SelectedBookingOptions, CalculatedPriceDetails } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { Loader2, CreditCard, CheckCircle, Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PaymentDetailsSchema, type PaymentFormValues } from "@/lib/validation/booking-schemas"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { PaymentMethodForm } from "@/components/dashboard/member/payment-methods/payment-method-form"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"

interface PaymentStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  calculatedPrice: CalculatedPriceDetails | null
  onSubmit: () => Promise<void>
  isLoading: boolean
  onPrev: () => void
  translations: Record<string, string>
}

export default function PaymentStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  calculatedPrice,
  onSubmit,
  isLoading,
  onPrev,
  translations,
}: PaymentStepProps) {
  const [isClientLoading, setIsClientLoading] = useState(true)
  const [showAddPaymentMethodForm, setShowAddPaymentMethodForm] = useState(false)
  const [localPaymentMethods, setLocalPaymentMethods] = useState<IPaymentMethod[]>(initialData.userPaymentMethods || [])

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentDetailsSchema),
    defaultValues: {
      selectedPaymentMethodId: bookingOptions.selectedPaymentMethodId || undefined,
    },
  })

  useEffect(() => {
    setIsClientLoading(false)
  }, [])

  // Update localPaymentMethods if initialData changes
  useEffect(() => {
    setLocalPaymentMethods(initialData.userPaymentMethods || [])
  }, [initialData.userPaymentMethods])

  // Effect to select default payment method or first one if none selected
  useEffect(() => {
    if (localPaymentMethods.length > 0 && !form.getValues("selectedPaymentMethodId")) {
      const defaultMethod = localPaymentMethods.find((pm) => pm.isDefault)
      const methodToSelect = defaultMethod || localPaymentMethods[0] // Select default or first

      if (methodToSelect) {
        const methodId = methodToSelect._id.toString()
        form.setValue("selectedPaymentMethodId", methodId)
        // No need to call setBookingOptions here, form.watch will handle it
      }
    }
  }, [localPaymentMethods, form]) // Rerun when localPaymentMethods or form instance changes

  // Watch for form changes and update bookingOptions
  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        selectedPaymentMethodId: values.selectedPaymentMethodId,
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  const handlePaymentMethodUpserted = (upsertedMethod: IPaymentMethod) => {
    setLocalPaymentMethods((prevMethods) => {
      const existingIndex = prevMethods.findIndex((pm) => pm._id.toString() === upsertedMethod._id.toString())
      let newMethodsArray
      if (existingIndex !== -1) {
        // Update existing method
        newMethodsArray = [...prevMethods]
        newMethodsArray[existingIndex] = upsertedMethod
      } else {
        // Add new method
        newMethodsArray = [...prevMethods, upsertedMethod]
      }

      // If the new method is set as default, unset others
      if (upsertedMethod.isDefault) {
        newMethodsArray = newMethodsArray.map((pm) =>
          pm._id.toString() === upsertedMethod._id.toString() ? pm : { ...pm, isDefault: false },
        )
      }
      return newMethodsArray
    })

    // Select the newly added/updated method
    form.setValue("selectedPaymentMethodId", upsertedMethod._id.toString())
    setShowAddPaymentMethodForm(false)
  }

  const onSubmitValidated = async (data: PaymentFormValues) => {
    await onSubmit()
  }

  if (isClientLoading || !calculatedPrice) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px] text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <span>{translations["bookings.steps.payment.loadingPrice"] || "Loading payment details..."}</span>
      </div>
    )
  }

  if (calculatedPrice.isFullyCoveredByVoucherOrSubscription && calculatedPrice.finalAmount === 0) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">
            {translations["bookings.steps.payment.confirmTitleNoPayment"] || "Confirm Your Booking"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            {translations["bookings.steps.payment.confirmDescNoPayment"] ||
              "Your booking is fully covered and no payment is required. Please review and confirm."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button variant="outline" onClick={onPrev} disabled={isLoading} type="button" size="lg">
            {translations["common.back"] || "Back"}
          </Button>
          <Button onClick={onSubmit} disabled={isLoading} type="button" size="lg">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translations["bookings.steps.payment.confirmBooking"] || "Confirm Booking"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translations["bookings.steps.payment.title"] || "Payment Details"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {translations["bookings.steps.payment.description"] ||
              "Please select a payment method to complete your booking."}{" "}
            <span className="font-semibold text-primary">
              {translations["common.totalPrice"] || "Total"}: {calculatedPrice.finalAmount.toFixed(2)}{" "}
              {translations["common.currency"] || "ILS"}
            </span>
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              {translations["bookings.steps.payment.selectPaymentMethod"] || "Select Payment Method"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {localPaymentMethods.length > 0 ? (
              <FormField
                control={form.control}
                name="selectedPaymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">
                      {translations["bookings.steps.payment.selectPaymentMethod"]}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                        {localPaymentMethods.map((pm) => (
                          <FormItem key={pm._id.toString()} className="flex items-center">
                            <FormControl>
                              <RadioGroupItem
                                value={pm._id.toString()}
                                id={`pm-${pm._id.toString()}`}
                                className="peer sr-only"
                              />
                            </FormControl>
                            <Label
                              htmlFor={`pm-${pm._id.toString()}`}
                              className={`flex flex-1 items-center justify-between p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors shadow-sm bg-card
                                ${field.value === pm._id.toString() ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50"}`}
                            >
                              <div className="flex items-center space-x-3">
                                <CreditCard
                                  className={`h-6 w-6 ${field.value === pm._id.toString() ? "text-primary" : "text-muted-foreground"}`}
                                />
                                <span className="font-medium">{pm.cardName || `**** ${pm.last4Digits}`}</span>
                                {pm.isDefault && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                                    {translations["paymentMethods.default"] || "Default"}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">{pm.cardType}</p>
                                <p className="text-xs text-muted-foreground">
                                  {translations["paymentMethods.fields.expiry"] || "Expires"}: {pm.expiryMonth}/
                                  {pm.expiryYear}
                                </p>
                              </div>
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="pt-2" />
                  </FormItem>
                )}
              />
            ) : (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>
                  {translations["bookings.steps.payment.noSavedPaymentMethodsTitle"] || "No Payment Methods"}
                </AlertTitle>
                <AlertDescription>
                  {translations["bookings.steps.payment.noSavedPaymentMethodsDesc"] ||
                    "You don't have any saved payment methods. Please add one to proceed."}
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              className="mt-6 w-full"
              type="button"
              onClick={() => setShowAddPaymentMethodForm(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {translations["paymentMethods.addNew"] || "Add New Payment Method"}
            </Button>
          </CardContent>
        </Card>

        <PaymentMethodForm
          open={showAddPaymentMethodForm}
          onOpenChange={setShowAddPaymentMethodForm}
          onPaymentMethodUpserted={handlePaymentMethodUpserted}
        />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isLoading}
            type="button"
            size="lg"
            className="w-full sm:w-auto"
          >
            {translations["common.back"] || "Back"}
          </Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              !form.formState.isValid ||
              (localPaymentMethods.length === 0 && calculatedPrice.finalAmount > 0) || // Disable if no methods and payment needed
              !form.getValues("selectedPaymentMethodId") // Disable if no method selected and payment needed
            }
            size="lg"
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {translations["bookings.steps.payment.payAndConfirm"] || "Pay & Confirm"}{" "}
            {calculatedPrice.finalAmount.toFixed(2)} {translations["common.currency"] || "ILS"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
