"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"

export interface GuestAddress {
  city: string
  street: string
  houseNumber: string
  addressType: "apartment" | "house" | "office" | "hotel" | "other"
  floor?: string
  apartmentNumber?: string
  entrance?: string
  parking: boolean
  notes?: string
  // Removed isDefault as it's not needed for guest bookings
  
  // Type-specific details
  doorName?: string // for house
  buildingName?: string // for office
  hotelName?: string // for hotel
  roomNumber?: string // for hotel
  instructions?: string // for other
}

interface GuestAddressStepProps {
  address: Partial<GuestAddress>
  setAddress: (address: Partial<GuestAddress>) => void
  onNext: () => void
  onPrev: () => void
}

const addressSchema = z.object({
  city: z.string().min(2, { message: "יש להזין עיר" }),
  street: z.string().min(2, { message: "יש להזין רחוב" }),
  houseNumber: z.string().min(1, { message: "יש להזין מספר בית" }),
  addressType: z.enum(["apartment", "house", "office", "hotel", "other"], { message: "יש לבחור סוג כתובת" }),
  floor: z.string().optional(),
  apartmentNumber: z.string().optional(),
  entrance: z.string().optional(),
  parking: z.boolean().optional(),
  notes: z.string().optional(),
  // Type-specific fields
  doorName: z.string().optional(),
  buildingName: z.string().optional(),
  hotelName: z.string().optional(),
  roomNumber: z.string().optional(),
  instructions: z.string().optional(),
})

type GuestAddressFormData = z.infer<typeof addressSchema>

export function GuestAddressStep({ address, setAddress, onNext, onPrev }: GuestAddressStepProps) {
  const { t, dir } = useTranslation()
  const [addressType, setAddressType] = useState<"apartment" | "house" | "office" | "hotel" | "other">(
    (address.addressType as "apartment" | "house" | "office" | "hotel" | "other") || "apartment"
  )

  const form = useForm<GuestAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      city: address.city || "",
      street: address.street || "",
      houseNumber: address.houseNumber || "",
      addressType: addressType,
      floor: address.floor || "",
      apartmentNumber: address.apartmentNumber || "",
      entrance: address.entrance || "",
      parking: address.parking || false,
      notes: address.notes || "",
      doorName: address.doorName || "",
      buildingName: address.buildingName || "",
      hotelName: address.hotelName || "",
      roomNumber: address.roomNumber || "",
      instructions: address.instructions || "",
    },
  })

  const onSubmit = (data: GuestAddressFormData) => {
    setAddress(data)
    onNext()
  }

  const handleAddressTypeChange = (value: string) => {
    const newType = value as "apartment" | "house" | "office" | "hotel" | "other"
    setAddressType(newType)
    form.setValue("addressType", newType)
    
    // Clear type-specific fields when changing type
    form.setValue("floor", "")
    form.setValue("apartmentNumber", "")
    form.setValue("entrance", "")
    form.setValue("doorName", "")
    form.setValue("buildingName", "")
    form.setValue("hotelName", "")
    form.setValue("roomNumber", "")
    form.setValue("instructions", "")
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.addressStep.title") || "הוסף כתובת חדשה"}</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("bookings.addressStep.title") || "הוסף כתובת חדשה"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.addressStep.city") || "עיר"}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.addressStep.street") || "רחוב"}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="houseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.addressStep.houseNumber") || "מספר בית"}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("bookings.addressStep.addressType") || "סוג כתובת"}</FormLabel>
                      <FormControl>
                        <Select onValueChange={handleAddressTypeChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">דירה</SelectItem>
                            <SelectItem value="house">בית פרטי</SelectItem>
                            <SelectItem value="office">משרד</SelectItem>
                            <SelectItem value="hotel">מלון</SelectItem>
                            <SelectItem value="other">אחר</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Type-specific fields */}
              {addressType === "apartment" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.floor") || "קומה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apartmentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.apartmentNumber") || "מספר דירה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entrance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.entrance") || "כניסה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {addressType === "house" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="doorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם על הדלת</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entrance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.entrance") || "כניסה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {addressType === "office" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="buildingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם הבניין</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entrance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.entrance") || "כניסה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("bookings.addressStep.floor") || "קומה"}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {addressType === "hotel" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hotelName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם המלון</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>מספר חדר</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {addressType === "other" && (
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>הוראות הגעה</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Parking checkbox */}
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t("bookings.addressStep.privateParking") || "חניה פרטית"}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.addressStep.notes") || "הערות נוספות"}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" type="button" onClick={onPrev}>{t("common.back")}</Button>
                <Button type="submit">{t("common.continue")}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 