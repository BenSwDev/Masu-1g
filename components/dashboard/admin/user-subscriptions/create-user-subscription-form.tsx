"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useTranslation } from "@/lib/translations/i18n"

const formSchema = z.object({
  userId: z.string().min(1, "User is required"),
  subscriptionId: z.string().min(1, "Subscription is required"),
  treatmentId: z.string().min(1, "Treatment is required"),
  selectedDurationId: z.string().optional(),
  remainingQuantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  expiryDate: z.date(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateUserSubscriptionFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

interface UserOption {
  _id: string
  name: string
  email: string
}

interface SubscriptionOption {
  _id: string
  name: string
  description: string
  quantity: number
}

interface TreatmentOption {
  _id: string
  name: string
  durations?: { _id: string; name: string; price: number }[]
}

export default function CreateUserSubscriptionForm({ onSubmit, isLoading = false, onCancel }: CreateUserSubscriptionFormProps) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserOption[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionOption[]>([])
  const [treatments, setTreatments] = useState<TreatmentOption[]>([])
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentOption | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      subscriptionId: "",
      treatmentId: "",
      selectedDurationId: "",
      remainingQuantity: 1,
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  })

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true)
      try {
        // Fetch users, subscriptions, and treatments
        // For now, we'll use placeholder data - in real app, these would be API calls
        setUsers([])
        setSubscriptions([])
        setTreatments([])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find(t => t._id === treatmentId)
    setSelectedTreatment(treatment || null)
    form.setValue("selectedDurationId", "")
  }

  const handleSubmit = async (values: FormValues) => {
    const data = new FormData()
    data.append("userId", values.userId)
    data.append("subscriptionId", values.subscriptionId)
    data.append("treatmentId", values.treatmentId)
    if (values.selectedDurationId) {
      data.append("selectedDurationId", values.selectedDurationId)
    }
    data.append("remainingQuantity", String(values.remainingQuantity))
    data.append("expiryDate", values.expiryDate.toISOString())
    await onSubmit(data)
  }

  if (loadingData) {
    return <div>Loading...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("userSubscriptions.user")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("userSubscriptions.selectUser")} />
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
          name="subscriptionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("userSubscriptions.subscription")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("userSubscriptions.selectSubscription")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subscriptions.map((subscription) => (
                    <SelectItem key={subscription._id} value={subscription._id}>
                      {subscription.name} ({subscription.quantity} sessions)
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
          name="treatmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("userSubscriptions.treatment")}</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value)
                  handleTreatmentChange(value)
                }} 
                defaultValue={field.value} 
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("userSubscriptions.selectTreatment")} />
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
                <FormLabel>{t("userSubscriptions.duration")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("userSubscriptions.selectDuration")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedTreatment && selectedTreatment.durations && selectedTreatment.durations.map((duration) => (
                      <SelectItem key={duration._id.toString()} value={duration._id.toString()}>
                        {duration.minutes} דקות - ₪{duration.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="remainingQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("userSubscriptions.remainingQuantity")}</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("userSubscriptions.expiryDate")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
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
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            {isLoading ? t("common.saving") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  )
} 
