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
import { Loader2, Info, PlusCircle, MapPin } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SchedulingDetailsSchema, type SchedulingFormValues, getTodayInTimezone } from "@/lib/validation/booking-schemas"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { cn } from "@/lib/utils/utils"
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
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz"
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
  const { t, language } = useTranslation()
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
      isFlexibleTime: bookingOptions.isFlexibleTime || false,
      flexibilityRangeHours: bookingOptions.flexibilityRangeHours || 2,
      isBookingForSomeoneElse: bookingOptions.isBookingForSomeoneElse || false,
      recipientName: bookingOptions.recipientName || "",
      recipientPhone: bookingOptions.recipientPhone || "",
      recipientEmail: bookingOptions.recipientEmail || "",
      recipientBirthdate: bookingOptions.recipientBirthdate || undefined,
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

  const onSubmitValidated = (_data: SchedulingFormValues) => {
    onNext()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitValidated)} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.scheduling.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("bookings.steps.scheduling.description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Left Column - Date Selection & Address */}
            <div className="border rounded-lg p-4 shadow-sm bg-card">
              <h3 className="text-lg font-medium mb-4">{t("bookings.steps.scheduling.selectDate")}</h3>
              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        className="mx-auto rounded-md"
                        disabled={(date) => date < getTodayInTimezone()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border rounded-lg p-4 shadow-sm bg-card">
              <FormField
                control={form.control}
                name="selectedAddressId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel className="text-base font-medium">{t("bookings.steps.scheduling.selectAddress")}</FormLabel>
                      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <PlusCircle className="mr-2 rtl:ml-2 h-4 w-4" />
                            {localAddresses.length > 0
                              ? t("addresses.addNewShort", "Add New")
                              : t("addresses.addFirstAddressShort", "Add Address")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px]">
                          <DialogHeader>
                            <DialogTitle>{t("addresses.addAddressDialogTitle", "Add New Address")}</DialogTitle>
                          </DialogHeader>
                          {isAddressModalOpen && (
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
            </div>
          </div>

          <div className="space-y-4">
            {/* Right Column - Time Selection & Other Options */}
            <div className="border rounded-lg p-4 shadow-sm bg-card">
              <h3 className="text-lg font-medium mb-4">{t("bookings.steps.scheduling.selectTime")}</h3>
              <FormField
                control={form.control}
                name="bookingTime"
                render={({ field }) => (
                  <FormItem>
                    {isTimeSlotsLoading ? (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse h-10 p-2 border rounded-md bg-muted animate-pulse">
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
            
            <div className="border rounded-lg p-4 shadow-sm bg-card">
              <h3 className="text-lg font-medium mb-4">{t("bookings.steps.scheduling.bookingOptions")}</h3>
              <FormField
                control={form.control}
                name="isBookingForSomeoneElse"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse rounded-md border p-3 shadow-sm bg-muted/30">
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
            
            {/* זמן גמיש מוסתר כרגע - יוחזר בעתיד
            <FormField
              control={form.control}
              name="isFlexibleTime"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 rtl:space-x-reverse rounded-md border p-3 shadow-sm bg-card">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} id="flexibleTime" />
                  </FormControl>
                  <div className="space-y-0.5">
                    <Label htmlFor="flexibleTime" className="text-sm font-medium cursor-pointer">
                      {t("bookings.steps.scheduling.flexibleTimeLabel")}
                    </Label>
                    <FormDescription className="text-xs">
                      {t("bookings.steps.scheduling.flexibleTimeDesc")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            */}
          </div>
        </div>



            </div>
          </div>
        
        {form.watch("isBookingForSomeoneElse") && (
          <div className="border rounded-lg p-5 mt-4 shadow-sm bg-card">
            <h3 className="text-lg font-medium mb-4">{t("bookings.steps.scheduling.forSomeoneElseDetails")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        placeholder={t("users.fields.emailPlaceholder")} 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <FormField
                control={form.control}
                name="recipientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.steps.scheduling.recipientPhone")}</FormLabel>
                    <FormControl>
                      <PhoneInput
                        id="recipientPhone"
                        name={field.name}
                        placeholder={t("users.fields.phonePlaceholder")}
                        fullNumberValue={field.value || ""}
                        onPhoneChange={field.onChange}
                        ref={field.ref}
                        dir="ltr" // Force left-to-right for phone numbers
                        className="text-left" // Ensure text alignment is left
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("bookings.steps.scheduling.phoneNumberLeftToRight")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientBirthdate"
                render={({ field }) => {
                  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
                  return (
                    <FormItem>
                      <FormLabel>{t("bookings.steps.scheduling.recipientBirthdate")}</FormLabel>
                      <FormControl>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-right font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                zonedTimeToUtc(field.value, "Asia/Jerusalem").toLocaleDateString("he-IL")
                              ) : (
                                <span>{t("bookings.steps.scheduling.recipientBirthdatePlaceholder")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsCalendarOpen(false);
                              }}
                              disabled={(date) => {
                                // Calculate 16 years ago
                                const sixteenYearsAgo = new Date();
                                sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16);
                                return date > sixteenYearsAgo;
                              }}
                              fromYear={1920}
                              toYear={new Date().getFullYear() - 16}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t("bookings.steps.scheduling.mustBe16YearsOld")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>
        )}

        <div className="border rounded-lg p-5 mt-4 shadow-sm bg-card">
          <h3 className="text-lg font-medium mb-4">{t("bookings.steps.scheduling.additionalInfo")}</h3>
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
        </div>

        <div className="flex justify-between pt-6 mt-4">
          <Button variant="outline" type="button" onClick={onPrev} disabled={form.formState.isSubmitting} size="lg">
            {t("common.back")}
          </Button>
          <Button
            type="submit"
            disabled={
              form.formState.isSubmitting || (!form.getValues("selectedAddressId") && localAddresses.length > 0)
            }
            size="lg"
            className="px-8"
          >
            {form.formState.isSubmitting && <Loader2 className="mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
            {t("common.next")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
