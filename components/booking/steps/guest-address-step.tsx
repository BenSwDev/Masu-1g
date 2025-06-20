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
import { CitySelectForm } from "@/components/common/ui/city-select-form"
import { MapPin, Car, Home, Building, Hotel, MapPinned, Check, X, DollarSign } from "lucide-react"
import { Label } from "@/components/common/ui/label"

interface GuestAddress {
  city?: string
  street?: string
  houseNumber?: string
  addressType?: "apartment" | "house" | "office" | "hotel" | "other"
  floor?: string
  apartment?: string
  apartmentNumber?: string
  entrance?: string
  buildingCode?: string
  doorCode?: string
  parking?: boolean
  parkingAvailable?: "free" | "paid" | "none"
  parkingCost?: string
  parkingInstructions?: string
  parkingNotes?: string
  notes?: string
  
  // Type-specific details
  doorName?: string // for house
  buildingName?: string // for office
  hotelName?: string // for hotel
  roomNumber?: string // for hotel
  instructions?: string // for other or general instructions
}

interface GuestAddressStepProps {
  address: Partial<GuestAddress>
  setAddress: (address: Partial<GuestAddress> | ((prev: Partial<GuestAddress>) => Partial<GuestAddress>)) => void
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
  const { t, dir, language } = useTranslation()
  
  const addressTypes = [
    { value: "apartment" as const, label: "דירה", icon: Building },
    { value: "house" as const, label: "בית פרטי", icon: Home },
    { value: "office" as const, label: "משרד", icon: Building },
    { value: "hotel" as const, label: "מלון", icon: Hotel },
    { value: "other" as const, label: "אחר", icon: MapPinned }
  ]

  const parkingOptions = [
    { value: "free" as const, label: "חניה חופשית", icon: Check },
    { value: "paid" as const, label: "חניה בתשלום", icon: DollarSign },
    { value: "none" as const, label: "אין חניה", icon: X }
  ]
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
    <div className="space-y-6" dir={dir} lang={language}>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.addressStep.title") || "הוסף כתובת חדשה"}</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <MapPin className="h-5 w-5" />
            {t("bookings.addressStep.addressDetails") || "פרטי הכתובת"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* סוג כתובת */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("bookings.addressStep.addressType") || "סוג כתובת"}</Label>
            <div className="flex flex-wrap gap-2">
              {addressTypes.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={addressType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddressType(type.value)}
                  className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* כתובת ועיר בשורה אחת */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
            <div className="md:col-span-2">
              <Label htmlFor="street">{t("bookings.addressStep.street") || "רחוב ומספר בית"} *</Label>
              <Input
                id="street"
                value={address.street || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                placeholder={t("bookings.addressStep.streetPlaceholder") || "רח' דוגמא 123"}
                className="mt-1"
                dir={dir}
              />
            </div>
            
            <div>
              <Label htmlFor="city">{t("bookings.addressStep.city") || "עיר"} *</Label>
              <Input
                id="city"
                value={address.city || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder={t("bookings.addressStep.cityPlaceholder") || "תל אביב"}
                className="mt-1"
                dir={dir}
              />
            </div>
          </div>

          {/* קומה ודירה בשורה אחת */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
            <div>
              <Label htmlFor="floor">{t("bookings.addressStep.floor") || "קומה"}</Label>
              <Input
                id="floor"
                value={address.floor || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, floor: e.target.value }))}
                placeholder={t("bookings.addressStep.floorPlaceholder") || "3"}
                className="mt-1"
                dir={dir}
              />
            </div>
            
            <div>
              <Label htmlFor="apartment">{t("bookings.addressStep.apartment") || "דירה"}</Label>
              <Input
                id="apartment"
                value={address.apartment || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, apartment: e.target.value }))}
                placeholder={t("bookings.addressStep.apartmentPlaceholder") || "12"}
                className="mt-1"
                dir={dir}
              />
            </div>
          </div>

          {/* קוד דלת וקוד בניין בשורה אחת */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
            <div>
              <Label htmlFor="buildingCode">{t("bookings.addressStep.buildingCode") || "קוד בניין"}</Label>
              <Input
                id="buildingCode"
                value={address.buildingCode || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, buildingCode: e.target.value }))}
                placeholder={t("bookings.addressStep.buildingCodePlaceholder") || "1234"}
                className="mt-1"
                dir={dir}
              />
            </div>
            
            <div>
              <Label htmlFor="doorCode">{t("bookings.addressStep.doorCode") || "קוד דלת"}</Label>
              <Input
                id="doorCode"
                value={address.doorCode || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, doorCode: e.target.value }))}
                placeholder={t("bookings.addressStep.doorCodePlaceholder") || "5678"}
                className="mt-1"
                dir={dir}
              />
            </div>
          </div>

          {/* הוראות והערות */}
          <div>
            <Label htmlFor="instructions">{t("bookings.addressStep.instructions") || "הוראות הגעה"}</Label>
            <Textarea
              id="instructions"
              value={address.instructions || ""}
              onChange={(e) => setAddress(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder={t("bookings.addressStep.instructionsPlaceholder") || "מעלית או מדרגות, איך למצוא את הכניסה..."}
              className="mt-1 resize-none"
              rows={3}
              dir={dir}
            />
          </div>
        </CardContent>
      </Card>

      {/* חניה */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <Car className="h-5 w-5" />
            {t("bookings.addressStep.parking") || "חניה"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("bookings.addressStep.parkingOptions") || "אפשרויות חניה"}</Label>
            <div className="flex flex-wrap gap-2">
              {parkingOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={address.parkingAvailable === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddress(prev => ({ ...prev, parkingAvailable: option.value }))}
                  className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {address.parkingAvailable === "paid" && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dir === "rtl" ? "md:grid-flow-col-dense" : ""}`}>
              <div>
                <Label htmlFor="parkingCost">{t("bookings.addressStep.parkingCost") || "עלות חניה (לשעה)"}</Label>
                <Input
                  id="parkingCost"
                  type="number"
                  value={address.parkingCost || ""}
                  onChange={(e) => setAddress(prev => ({ ...prev, parkingCost: e.target.value }))}
                  placeholder="15"
                  className="mt-1"
                  dir={dir}
                />
              </div>
              <div>
                <Label htmlFor="parkingInstructions">{t("bookings.addressStep.parkingInstructions") || "הוראות חניה"}</Label>
                <Input
                  id="parkingInstructions"
                  value={address.parkingInstructions || ""}
                  onChange={(e) => setAddress(prev => ({ ...prev, parkingInstructions: e.target.value }))}
                  placeholder={t("bookings.addressStep.parkingInstructionsPlaceholder") || "חניה ברחוב או חניון"}
                  className="mt-1"
                  dir={dir}
                />
              </div>
            </div>
          )}

          {address.parkingAvailable !== "free" && (
            <div>
              <Label htmlFor="parkingNotes">{t("bookings.addressStep.parkingNotes") || "הערות נוספות על חניה"}</Label>
              <Textarea
                id="parkingNotes"
                value={address.parkingNotes || ""}
                onChange={(e) => setAddress(prev => ({ ...prev, parkingNotes: e.target.value }))}
                placeholder={t("bookings.addressStep.parkingNotesPlaceholder") || "מידע נוסף על חניה באזור..."}
                className="mt-1 resize-none"
                rows={2}
                dir={dir}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={onPrev}>{t("common.back")}</Button>
        <Button type="submit">{t("common.continue")}</Button>
      </div>
    </div>
  )
} 