"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { createGiftVoucher, updateGiftVoucher, getUsers } from "@/actions/gift-voucher-actions"
import { getTreatments } from "@/actions/treatment-actions"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

export interface GiftVoucherPlain {
  _id: string
  code: string
  voucherType: "treatment" | "monetary"
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue: number
  remainingAmount: number
  purchaserUserId: string
  ownerUserId: string
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  greetingMessage?: string
  sendDate?: Date
  status: string
  purchaseDate: Date
  validFrom: Date
  validUntil: Date
  isActive: boolean
  paymentId?: string
  usageHistory: Array<{
    date: Date
    amountUsed: number
    orderId?: string
  }>
  createdAt?: Date
  updatedAt?: Date
}

interface GiftVoucherFormProps {
  initialData?: GiftVoucherPlain
  onSuccess?: () => void
  onCancel?: () => void
}

const formSchema = z
  .object({
    code: z.string().min(1, "קוד נדרש"),
    voucherType: z.enum(["treatment", "monetary"], {
      required_error: "יש לבחור סוג שובר",
    }),
    treatmentId: z.string().optional(),
    selectedDurationId: z.string().optional(),
    monetaryValue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "הערך חייב להיות מספר חיובי",
    }),
    ownerUserId: z.string().min(1, "יש לבחור משתמש"),
    validFrom: z.string().min(1, "תאריך התחלה נדרש"),
    validUntil: z.string().min(1, "תאריך סיום נדרש"),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.voucherType === "treatment" && !data.treatmentId) {
        return false
      }
      return true
    },
    {
      message: "יש לבחור טיפול עבור שובר טיפול",
      path: ["treatmentId"],
    },
  )

export function GiftVoucherForm({ initialData, onSuccess, onCancel }: GiftVoucherFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [treatments, setTreatments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      voucherType: initialData?.voucherType ?? "monetary",
      treatmentId: initialData?.treatmentId ?? "",
      selectedDurationId: initialData?.selectedDurationId ?? "",
      monetaryValue: initialData?.monetaryValue?.toString() ?? "",
      ownerUserId: initialData?.ownerUserId ?? "",
      validFrom: initialData?.validFrom ? format(new Date(initialData.validFrom), "yyyy-MM-dd") : "",
      validUntil: initialData?.validUntil ? format(new Date(initialData.validUntil), "yyyy-MM-dd") : "",
      isActive: initialData?.isActive ?? true,
    },
  })

  const watchVoucherType = form.watch("voucherType")
  const watchTreatmentId = form.watch("treatmentId")

  useEffect(() => {
    loadTreatments()
    loadUsers()
  }, [])

  useEffect(() => {
    if (watchTreatmentId) {
      const treatment = treatments.find((t) => t._id === watchTreatmentId)
      setSelectedTreatment(treatment)
    }
  }, [watchTreatmentId, treatments])

  async function loadTreatments() {
    try {
      const result = await getTreatments()
      if (result.success && result.treatments) {
        setTreatments(result.treatments)
      }
    } catch (error) {
      console.error("Failed to load treatments:", error)
    }
  }

  async function loadUsers() {
    try {
      const result = await getUsers()
      if (result.success && result.users) {
        setUsers(result.users.filter((user) => user.role === "member"))
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append("code", values.code)
      formData.append("voucherType", values.voucherType)

      if (values.voucherType === "treatment" && values.treatmentId) {
        formData.append("treatmentId", values.treatmentId)
        if (values.selectedDurationId) {
          formData.append("selectedDurationId", values.selectedDurationId)
        }
      } else if (values.voucherType === "monetary") {
        formData.append("monetaryValue", values.monetaryValue)
      }

      formData.append("ownerUserId", values.ownerUserId)
      formData.append("validFrom", values.validFrom)
      formData.append("validUntil", values.validUntil)
      formData.append("isActive", values.isActive.toString())

      const result = initialData
        ? await updateGiftVoucher(initialData._id, formData)
        : await createGiftVoucher(formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: initialData ? "שובר מתנה עודכן" : "שובר מתנה נוצר",
        description: initialData ? "שובר המתנה עודכן בהצלחה." : "שובר המתנה נוצר בהצלחה.",
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "משהו השתבש",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>קוד</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="voucherType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>סוג שובר</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג שובר" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monetary">שובר כספי</SelectItem>
                  <SelectItem value="treatment">שובר טיפול</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchVoucherType === "treatment" && (
          <>
            <FormField
              control={form.control}
              name="treatmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>טיפול</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר טיפול" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {treatments.map((treatment) => (
                        <SelectItem key={treatment._id} value={treatment._id}>
                          {treatment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTreatment?.durations && selectedTreatment.durations.length > 0 && (
              <FormField
                control={form.control}
                name="selectedDurationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>משך זמן</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר משך זמן" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedTreatment.durations.map((duration: any) => (
                          <SelectItem key={duration._id} value={duration._id}>
                            {duration.duration} דקות - ₪{duration.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {watchVoucherType === "monetary" && (
          <FormField
            control={form.control}
            name="monetaryValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ערך כספי (₪)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="150" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="ownerUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>משתמש יעד</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר משתמש" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>תקף מתאריך</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>תקף עד תאריך</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>פעיל</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              ביטול
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "שומר..." : initialData ? "עדכן" : "צור"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default GiftVoucherForm
