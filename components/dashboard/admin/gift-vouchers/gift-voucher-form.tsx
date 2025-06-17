"use client"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import {
  createGiftVoucherByAdmin,
  updateGiftVoucherByAdmin,
  type AdminGiftVoucherFormData,
  type GiftVoucherPlain,
  getTreatmentsForSelection,
  getUsersForAdminSelection,
} from "@/actions/gift-voucher-actions"
import { format, parseISO } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import { cn } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"

const giftVoucherStatuses = [
  "pending_payment",
  "active",
  "partially_used",
  "fully_used",
  "expired",
  "pending_send",
  "sent",
  "cancelled",
] as const

// Define Zod schema based on AdminGiftVoucherFormData
const giftVoucherSchema = z
  .object({
    code: z.string().min(3, "Code must be at least 3 characters"),
    voucherType: z.enum(["treatment", "monetary"]),
    treatmentId: z.string().optional(),
    selectedDurationId: z.string().optional(),
    monetaryValue: z.string().optional(), // String because input type number can be tricky
    ownerUserId: z.string().min(1, "Owner user is required"),
    validFrom: z.date({ required_error: "Valid from date is required." }),
    validUntil: z.date({ required_error: "Valid until date is required." }),
    status: z.enum(giftVoucherStatuses),
  })
  .superRefine((data, ctx) => {
    if (data.voucherType === "monetary") {
      if (
        !data.monetaryValue ||
        isNaN(Number.parseFloat(data.monetaryValue)) ||
        Number.parseFloat(data.monetaryValue) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Monetary value must be a positive number",
          path: ["monetaryValue"],
        })
      }
    } else if (data.voucherType === "treatment") {
      if (!data.treatmentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Treatment is required for treatment voucher",
          path: ["treatmentId"],
        })
      }
      // Add duration validation if treatment requires it
    }
    if (data.validFrom && data.validUntil && data.validUntil < data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid until date must be after valid from date",
        path: ["validUntil"],
      })
    }
  })

type GiftVoucherFormValues = z.infer<typeof giftVoucherSchema>

interface GiftVoucherFormProps {
  initialData?: GiftVoucherPlain
  onSuccess?: () => void
  onCancel?: () => void
}

interface TreatmentOption {
  _id: string
  name: string
  price?: number
  durations: { _id: string; name: string; price: number }[]
}
interface UserOption {
  _id: string
  name: string
  email: string
}

export function GiftVoucherForm({ initialData, onSuccess, onCancel }: GiftVoucherFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [treatments, setTreatments] = useState<TreatmentOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentOption | null>(null)
  const { t } = useTranslation()

  const form = useForm<GiftVoucherFormValues>({
    resolver: zodResolver(giftVoucherSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      voucherType: initialData?.voucherType ?? "monetary",
      treatmentId: initialData?.treatmentId ?? undefined,
      selectedDurationId: initialData?.selectedDurationId ?? undefined,
      monetaryValue: initialData?.monetaryValue?.toString() ?? "",
      ownerUserId: initialData?.ownerUserId ?? "",
      validFrom: initialData?.validFrom
        ? typeof initialData.validFrom === "string"
          ? parseISO(initialData.validFrom)
          : initialData.validFrom
        : new Date(),
      validUntil: initialData?.validUntil
        ? typeof initialData.validUntil === "string"
          ? parseISO(initialData.validUntil)
          : initialData.validUntil
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      status: initialData?.status ?? "active",
    },
  })

  const voucherType = form.watch("voucherType")

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      const [treatmentsRes, usersRes] = await Promise.all([getTreatmentsForSelection(), getUsersForAdminSelection()])
      if (treatmentsRes.success && treatmentsRes.treatments) {
        setTreatments(treatmentsRes.treatments)
        if (initialData?.treatmentId) {
          const foundTreatment = treatmentsRes.treatments.find((t) => t._id === initialData.treatmentId)
          if (foundTreatment) setSelectedTreatment(foundTreatment)
        }
      } else {
        toast({
          title: t("common.error"),
          description: t("giftVouchers.fetchErrorTreatments") || "Failed to load treatments.",
          variant: "destructive",
        })
      }
      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users)
      } else {
        toast({
          title: t("common.error"),
          description: t("giftVouchers.fetchErrorUsers") || "Failed to load users.",
          variant: "destructive",
        })
      }
      setIsLoading(false)
    }
    fetchData()
  }, [toast, initialData?.treatmentId, t])

  useEffect(() => {
    if (voucherType === "monetary") {
      form.setValue("treatmentId", undefined)
      form.setValue("selectedDurationId", undefined)
      setSelectedTreatment(null)
    } else {
      form.setValue("monetaryValue", undefined)
    }
  }, [voucherType, form])

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find((t) => t._id === treatmentId)
    setSelectedTreatment(treatment || null)
    form.setValue("treatmentId", treatmentId)
    form.setValue("selectedDurationId", undefined) // Reset duration when treatment changes
  }

  async function onSubmit(values: GiftVoucherFormValues) {
    try {
      setIsLoading(true)
      const formData: AdminGiftVoucherFormData = {
        ...values, // Spread validated form values
        monetaryValue: values.monetaryValue, // Keep as string for action
        validFrom: format(values.validFrom, "yyyy-MM-dd"),
        validUntil: format(values.validUntil, "yyyy-MM-dd"),
        // 'status' is already part of 'values' from the form
      }

      const result = initialData
        ? await updateGiftVoucherByAdmin(initialData._id, formData)
        : await createGiftVoucherByAdmin(formData)

      if (!result.success || !result.giftVoucher) {
        throw new Error(result.error || t("common.unknownError"))
      }

      toast({
        title: initialData ? t("giftVouchers.updateSuccess") : t("giftVouchers.createSuccess"),
        description: t(`giftVouchers.operationSuccessMessage.${result.giftVoucher.code}.${initialData ? 'updated' : 'created'}`),
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.unknownError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("giftVouchers.fields.code")}</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} placeholder={t("giftVouchers.fields.codePlaceholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("giftVouchers.fields.owner")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading || users.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("giftVouchers.fields.selectOwner")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
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
          name="voucherType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("giftVouchers.fields.voucherType")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("giftVouchers.fields.selectType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monetary">{t("giftVouchers.types.monetary")}</SelectItem>
                  <SelectItem value="treatment">{t("giftVouchers.types.treatment")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {voucherType === "monetary" && (
          <FormField
            control={form.control}
            name="monetaryValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("giftVouchers.fields.monetaryValue")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isLoading}
                    placeholder={t("giftVouchers.fields.monetaryValuePlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {voucherType === "treatment" && (
          <>
            <FormField
              control={form.control}
              name="treatmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("giftVouchers.fields.treatment")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleTreatmentChange(value)
                    }}
                    defaultValue={field.value}
                    disabled={isLoading || treatments.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("giftVouchers.fields.selectTreatment")} />
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
            {selectedTreatment && selectedTreatment.durations && selectedTreatment.durations.length > 0 && (
              <FormField
                control={form.control}
                name="selectedDurationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("giftVouchers.fields.duration")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("giftVouchers.fields.selectDuration")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedTreatment.durations.map((duration) => (
                          <SelectItem key={duration._id} value={duration._id}>
                            {duration.name} - {duration.price} {t("common.currency")}
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

        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("giftVouchers.fields.validFrom")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      {field.value ? format(field.value, "PPP") : <span>{t("common.pickDate")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || isLoading}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("giftVouchers.fields.validUntil")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      {field.value ? format(field.value, "PPP") : <span>{t("common.pickDate")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < (form.getValues("validFrom") || new Date()) || isLoading}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("giftVouchers.fields.status")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("giftVouchers.fields.selectStatus")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {giftVoucherStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`giftVouchers.statuses.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t("common.saving") : initialData ? t("common.update") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default GiftVoucherForm
