"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import type { BookingInitialData, SelectedBookingOptions, TimeSlot } from "@/types/booking"
import { Button } from "@/components/common/ui/button"
import { Calendar } from "@/components/common/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { Input } from "@/components/common/ui/input"
import { Loader2, Info, PlusCircle, MapPin, User } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SchedulingDetailsSchema, type SchedulingFormValues, getTodayInTimezone } from "@/lib/validation/booking-schemas"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { useTranslation } from "@/lib/translations/i18n"
import { AddressForm } from "@/components/dashboard/member/addresses/address-form"
import type { IAddress } from "@/lib/db/models/address"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/common/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { PhoneInput } from "@/components/common/phone-input"
import { toZonedTime } from "date-fns-tz"
import { startOfDay } from "date-fns"

interface SchedulingStepProps {
  initialData: BookingInitialData
  bookingOptions: Partial<SelectedBookingOptions>
  setBookingOptions: React.Dispatch<React.SetStateAction<Partial<SelectedBookingOptions>>>
  timeSlots: TimeSlot[]
  isTimeSlotsLoading: boolean
  onNext: () => void
  onPrev: () => void
  workingHoursNote?: string
}

// Helper component to display address details, similar to AddressCard
function SelectedAddressDetailsDisplay({
  address,
  t,
}: { address: IAddress; t: (key: string, options?: any) => string }) {
  if (!address) return null

  const mainLine =
    [address.street, address.streetNumber, address.city]
      .filter((v) => typeof v === "string" && v.trim() !== "")
      .join(", ") || t("addresses.noDetails")

  const details: string[] = []
  if (address.addressType === "apartment" && address.apartmentDetails) {
    if (address.apartmentDetails.floor !== undefined && address.apartmentDetails.floor !== null) {
      details.push(`${t("addresses.fields.floor")}: ${address.apartmentDetails.floor}`)
    }
    if (address.apartmentDetails.apartmentNumber) {
      details.push(`${t("addresses.fields.apartmentNumber")}: ${address.apartmentDetails.apartmentNumber}`)
    }
    if (address.apartmentDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.apartmentDetails.entrance}`)
    }
  }
  if (address.addressType === "house" && address.houseDetails) {
    if (address.houseDetails.doorName) {
      details.push(`${t("addresses.fields.doorName")}: ${address.houseDetails.doorName}`)
    }
    if (address.houseDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.houseDetails.entrance}`)
    }
  }
  if (address.addressType === "office" && address.officeDetails) {
    if (address.officeDetails.buildingName) {
      details.push(`${t("addresses.fields.buildingName")}: ${address.officeDetails.buildingName}`)
    }
    if (address.officeDetails.floor !== undefined && address.officeDetails.floor !== null) {
      details.push(`${t("addresses.fields.floor")}: ${address.officeDetails.floor}`)
    }
    if (address.officeDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.officeDetails.entrance}`)
    }
  }
  if (address.addressType === "hotel" && address.hotelDetails) {
    if (address.hotelDetails.hotelName) {
      details.push(`${t("addresses.fields.hotelName")}: ${address.hotelDetails.hotelName}`)
    }
    if (address.hotelDetails.roomNumber) {
      details.push(`${t("addresses.fields.roomNumber")}: ${address.hotelDetails.roomNumber}`)
    }
  }
  if (address.addressType === "other" && address.otherDetails?.instructions) {
    details.push(`${t("addresses.fields.instructions")}: ${address.otherDetails.instructions}`)
  }
  if (address.hasPrivateParking) {
    details.push(t("addresses.fields.hasPrivateParkingFull", "Has private parking"))
  }
  if (address.additionalNotes) {
    details.push(`${t("addresses.fields.additionalNotes")}: ${address.additionalNotes}`)
  }

  return (
    <Card className="mt-4 border-turquoise-500 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-md font-semibold text-turquoise-700">
          {t("addresses.selectedAddressDetails", "Selected Address Details")}
        </CardTitle>
        <MapPin className="h-5 w-5 text-turquoise-500" />
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium">{mainLine}</p>
        <p className="text-xs text-muted-foreground">{t(`addresses.types.${address.addressType}`)}</p>
        {address.isDefault && (
          <Badge variant="outline" className="text-xs border-turquoise-500 text-turquoise-600">
            {t("addresses.fields.isDefault")}
          </Badge>
        )}
        {details.length > 0 && (
          <div className="pt-2 space-y-0.5">
            {details.map((detail, index) => (
              <p key={index} className="text-xs text-muted-foreground">
                {detail}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SchedulingStep({
  initialData,
  bookingOptions,
  setBookingOptions,
  timeSlots,
  isTimeSlotsLoading,
  onNext,
  onPrev,
  workingHoursNote,
}: SchedulingStepProps) {
  const { t, language, dir } = useTranslation()
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [localAddresses, setLocalAddresses] = useState<IAddress[]>(initialData.userAddresses || [])

  // Use the original schema with timezone-aware validation now built in
  const form = useForm<SchedulingFormValues>({
    resolver: zodResolver(SchedulingDetailsSchema),
    defaultValues: {
      bookingDate: bookingOptions.bookingDate || undefined,
      bookingTime: bookingOptions.bookingTime || undefined,
      selectedAddressId: bookingOptions.selectedAddressId || undefined,
      notes: bookingOptions.notes || "",
      isFlexibleTime: false, // Always set to false - hidden from UI
      flexibilityRangeHours: 2,
      isBookingForSomeoneElse: bookingOptions.isBookingForSomeoneElse || false,
      recipientName: bookingOptions.recipientName || "",
      recipientPhone: bookingOptions.recipientPhone || "",
      recipientEmail: bookingOptions.recipientEmail || "",
      recipientBirthDate: bookingOptions.recipientBirthDate || undefined,
      customAddressDetails: bookingOptions.customAddressDetails || undefined,
    },
  })

  const selectedAddressId = useWatch({ control: form.control, name: "selectedAddressId" })

  const displayedAddressDetails = useMemo(() => {
    if (!selectedAddressId) return null
    return localAddresses.find((addr) => addr._id.toString() === selectedAddressId) || null
  }, [selectedAddressId, localAddresses])

  // Set default address on mount if not already set
  useEffect(() => {
    if (localAddresses.length > 0 && !form.getValues("selectedAddressId")) {
      const defaultAddress = localAddresses.find((a) => a.isDefault) || localAddresses[0]
      if (defaultAddress) {
        form.setValue("selectedAddressId", defaultAddress._id.toString())
      }
    }
  }, [localAddresses, form]) // form added to dependency array

  useEffect(() => {
    const subscription = form.watch((values) => {
      setBookingOptions((prev) => ({
        ...prev,
        ...values,
        bookingDate: values.bookingDate || null, // Ensure null if undefined
        isFlexibleTime: false, // Always set to false
      }))
    })
    return () => subscription.unsubscribe()
  }, [form, setBookingOptions])

  // Clear time when date changes
  const watchedDate = useWatch({ control: form.control, name: "bookingDate" })
  useEffect(() => {
    if (watchedDate) {
      // Only clear if a new date is actually selected
      const previousDate = form.formState.defaultValues?.bookingDate
      // Check if it's a meaningful change, not just initial set
      if (previousDate && previousDate.getTime() !== watchedDate.getTime()) {
        form.setValue("bookingTime", undefined, { shouldValidate: true })
      } else if (!previousDate) {
        // If there was no previous date (initial load with a date)
        // Potentially do nothing or handle as needed, current logic is fine
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDate]) // form.setValue and form.formState.defaultValues should not be dependencies here

  // Auto-select first available time slot when timeSlots change
  useEffect(() => {
    if (timeSlots.length > 0 && !form.getValues("bookingTime") && form.getValues("bookingDate")) {
      const firstAvailableSlot = timeSlots.find((slot) => slot.isAvailable)
      if (firstAvailableSlot) {
        form.setValue("bookingTime", firstAvailableSlot.time, { shouldValidate: true })
      }
    }
  }, [timeSlots, form])

  const handleAddressUpserted = (upsertedAddress: IAddress) => {
    setLocalAddresses((prev) => {
      const existingIndex = prev.findIndex((a) => a._id.toString() === upsertedAddress._id.toString())
      let newAddresses
      if (existingIndex > -1) {
        newAddresses = [...prev]
        newAddresses[existingIndex] = upsertedAddress
      } else {
        newAddresses = [...prev, upsertedAddress]
      }
      // If the new/updated address is set as default, update others
      if (upsertedAddress.isDefault) {
        newAddresses = newAddresses.map((addr) =>
          addr._id.toString() === upsertedAddress._id.toString() ? addr : { ...addr, isDefault: false },
        )
      }
      return newAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.city.localeCompare(b.city))
    })
    form.setValue("selectedAddressId", upsertedAddress._id.toString(), { shouldValidate: true })
    setIsAddressModalOpen(false)
  }

  const onSubmitValidated = (data: SchedulingFormValues) => {
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.scheduling.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.scheduling.description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <FormField
            control={form.control}
            name="bookingDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("bookings.steps.scheduling.selectDate")}</FormLabel>
                <FormControl>
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    className="rounded-md border self-start shadow-sm bg-card"
                    disabled={(date) => date < getTodayInTimezone()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="bookingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bookings.steps.scheduling.selectTime")}</FormLabel>
                  {isTimeSlotsLoading ? (
                    <div className={`flex items-center h-10 p-2 border rounded-md bg-muted animate-pulse ${dir === "rtl" ? "space-x-reverse" : "space-x-2"}`}>
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">{t("common.loading")}</span>
                    </div>
                  ) : timeSlots.length > 0 ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!form.getValues("bookingDate")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("bookings.steps.scheduling.selectTimePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots
                          .filter((slot) => slot.isAvailable)
                          .map((slot) => (
                            <SelectItem key={slot.time} value={slot.time}>
                              {slot.time}
                              {slot.surcharge &&
                                ` (+${slot.surcharge.amount.toFixed(2)} ${t("common.currencySymbol", "$")})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Alert variant="default" className="text-sm">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {form.getValues("bookingDate")
                          ? workingHoursNote
                            ? t(workingHoursNote)
                            : t("bookings.steps.scheduling.noSlotsAvailable")
                          : t("bookings.steps.scheduling.selectDateFirst")}
                      </AlertDescription>
                    </Alert>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </div>

        <FormField
          control={form.control}
          name="selectedAddressId"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center mb-1">
                <FormLabel>{t("bookings.steps.scheduling.selectAddress")}</FormLabel>
                <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <PlusCircle className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                      {localAddresses.length > 0
                        ? t("addresses.addNewShort", "Add New")
                        : t("addresses.addFirstAddressShort", "Add Address")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle>{t("addresses.addAddressDialogTitle", "Add New Address")}</DialogTitle>
                    </DialogHeader>
                    {isAddressModalOpen && ( // Important: Render form only when dialog is open
                      <AddressForm onCancel={() => setIsAddressModalOpen(false)} onSuccess={handleAddressUpserted} />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              {localAddresses.length > 0 ? (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bookings.steps.scheduling.selectAddressPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {localAddresses.map((address) => (
                      <SelectItem key={address._id.toString()} value={address._id.toString()}>
                        {`${address.street} ${address.streetNumber || ""}, ${address.city}`}
                        {address.isDefault && ` (${t("addresses.fields.isDefault")})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("bookings.steps.scheduling.noSavedAddressesTitle")}</AlertTitle>
                  <AlertDescription>{t("bookings.steps.scheduling.noSavedAddressesDesc")}</AlertDescription>
                </Alert>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {displayedAddressDetails && <SelectedAddressDetailsDisplay address={displayedAddressDetails} t={t} />}

        <FormField
          control={form.control}
          name="isBookingForSomeoneElse"
          render={({ field }) => (
            <FormItem className={`flex flex-row items-center rounded-md border p-3 shadow-sm bg-card ${dir === "rtl" ? "space-x-reverse" : "space-x-3"}`}>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isForSomeoneElse" />
              </FormControl>
              <div className="space-y-0.5">
                <Label htmlFor="isForSomeoneElse" className="text-sm font-medium cursor-pointer">
                  {t("bookings.steps.scheduling.forSomeoneElseLabel")}
                </Label>
              </div>
            </FormItem>
          )}
        />

        {form.watch("isBookingForSomeoneElse") && (
          <Card className="border-turquoise-200 bg-turquoise-50/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-turquoise-700">
                <User className="h-5 w-5" />
                {t("bookings.steps.scheduling.recipientDetailsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.steps.scheduling.recipientName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("users.fields.namePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.steps.scheduling.recipientEmail")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t("users.fields.emailPlaceholder", "Enter email address")} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.steps.scheduling.recipientPhone")}</FormLabel>
                      <FormControl>
                        <div dir="ltr" className="w-full">
                          <PhoneInput
                            id="recipientPhone"
                            name={field.name}
                            placeholder={t("users.fields.phonePlaceholder")}
                            fullNumberValue={field.value || ""}
                            onPhoneChange={field.onChange}
                            ref={field.ref}
                            className="text-left"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientBirthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.steps.scheduling.recipientBirthDate")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t("bookings.steps.scheduling.recipientBirthDateDesc")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bookings.steps.scheduling.notes")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("bookings.steps.scheduling.notesPlaceholder")} {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-6">
          <Button variant="outline" type="button" onClick={onPrev} disabled={form.formState.isSubmitting} size="lg">
            {t("common.back")}
          </Button>
          <Button
            type="submit"
            disabled={
              form.formState.isSubmitting || (!form.getValues("selectedAddressId") && localAddresses.length > 0)
            }
            size="lg"
          >
            {form.formState.isSubmitting && <Loader2 className={`h-4 w-4 animate-spin ${dir === "rtl" ? "ml-2" : "mr-2"}`} />}
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
