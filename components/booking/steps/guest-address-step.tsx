"use client"

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
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"

interface GuestAddress {
  city: string
  street: string
  houseNumber: string
  addressType: string
  floor?: string
  apartmentNumber?: string
  entrance?: string
  parking: boolean
  isDefault: boolean
  notes?: string
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
  addressType: z.string().min(1, { message: "יש לבחור סוג כתובת" }),
  floor: z.string().optional(),
  apartmentNumber: z.string().optional(),
  entrance: z.string().optional(),
  parking: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional(),
})

type GuestAddressFormData = z.infer<typeof addressSchema>

export function GuestAddressStep({ address, setAddress, onNext, onPrev }: GuestAddressStepProps) {
  const { t } = useTranslation()

  const form = useForm<GuestAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      city: address.city || "",
      street: address.street || "",
      houseNumber: address.houseNumber || "",
      addressType: address.addressType || "דירה",
      floor: address.floor || "",
      apartmentNumber: address.apartmentNumber || "",
      entrance: address.entrance || "",
      parking: address.parking || false,
      notes: address.notes || "",
    },
  })

  const onSubmit = (data: GuestAddressFormData) => {
    setAddress(data)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.addressStep.title", "הוסף כתובת חדשה")}</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("bookings.addressStep.title", "הוסף כתובת חדשה")}</CardTitle>
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
                      <FormLabel>{t("bookings.addressStep.city")}</FormLabel>
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
                      <FormLabel>{t("bookings.addressStep.street")}</FormLabel>
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
                      <FormLabel>{t("bookings.addressStep.houseNumber")}</FormLabel>
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
                      <FormLabel>{t("bookings.addressStep.addressType")}</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="דירה">דירה</SelectItem>
                            <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                            <SelectItem value="משרד">משרד</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <FormLabel>{t("bookings.addressStep.floor")}</FormLabel>
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
                      <FormLabel>{t("bookings.addressStep.apartmentNumber")}</FormLabel>
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
                      <FormLabel>{t("bookings.addressStep.entrance")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-center mt-2">
                <FormField
                  control={form.control}
                  name="parking"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <RadioGroup
                          value={field.value ? "yes" : "no"}
                          onValueChange={val => field.onChange(val === "yes")}
                          className="flex flex-row gap-2"
                        >
                          <RadioGroupItem value="yes" id="parking-yes" />
                          <FormLabel htmlFor="parking-yes">{t("bookings.addressStep.privateParking", "חניה פרטית")}</FormLabel>
                          <RadioGroupItem value="no" id="parking-no" />
                          <FormLabel htmlFor="parking-no">{t("bookings.addressStep.noParking", "ללא חניה פרטית")}</FormLabel>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.addressStep.notes", "הערות נוספות")}</FormLabel>
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