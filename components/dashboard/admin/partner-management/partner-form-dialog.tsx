"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PhoneInput } from "@/components/common/phone-input"
import { useToast } from "@/components/ui/use-toast"
import { createPartner, updatePartner } from "@/app/dashboard/(user)/(roles)/admin/partners/actions"

export interface PartnerData {
  id: string
  name: string
  email: string
  phone?: string | null
  gender?: string | null
  businessNumber: string
  contactName: string
}

interface PartnerFormDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialData?: PartnerData | null
  onSuccess: () => void
}

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.preprocess(
    v => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(5).optional()
  ),
  password: z.preprocess(
    v => (typeof v === "string" && v === "" ? undefined : v),
    z.string().min(6).optional()
  ),
  gender: z.enum(["male", "female", "other"]).default("male"),
  businessNumber: z.string().min(2),
  contactName: z.string().min(2),
})

type FormValues = z.infer<typeof formSchema>

export default function PartnerFormDialog({
  isOpen,
  onOpenChange,
  initialData,
  onSuccess,
}: PartnerFormDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      password: "",
      gender: (initialData?.gender as "male" | "female" | "other") || "male",
      businessNumber: initialData?.businessNumber || "",
      contactName: initialData?.contactName || "",
    },
  })

  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      password: "",
      gender: (initialData?.gender as "male" | "female" | "other") || "male",
      businessNumber: initialData?.businessNumber || "",
      contactName: initialData?.contactName || "",
    })
  }, [initialData, form])

  async function onSubmit(_values: FormValues) {
    try {
      setLoading(true)
      const _data = new FormData()
      data.append("name", values.name)
      if (values.email) data.append("email", values.email)
      data.append("phone", values.phone ?? "")
      if (!initialData && values.password) data.append("password", values.password)
      data.append("gender", values.gender)
      data.append("businessNumber", values.businessNumber)
      data.append("contactName", values.contactName)

      const result = initialData
        ? await updatePartner(initialData.id, data)
        : await createPartner(data)

      if (result.success) {
        toast({ title: "הצלחה", description: initialData ? "השותף עודכן" : "השותף נוצר" })
        onSuccess()
        onOpenChange(false)
      } else {
        toast({
          title: "שגיאה",
          description: result.error || "שגיאה בשמירת השותף",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: "שגיאה", description: "שגיאה בשמירת השותף", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "עריכת שותף" : "יצירת שותף"}</DialogTitle>
          <DialogDescription>
            {initialData ? "עדכון פרטי השותף" : "הוספת שותף חדש"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם מלא</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימייל (אופציונלי)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>טלפון</FormLabel>
                  <FormControl>
                    <PhoneInput fullNumberValue={field.value} onPhoneChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!initialData && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מגדר</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">זכר</SelectItem>
                        <SelectItem value="female">נקבה</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ח.פ</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם איש קשר</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "שומר..." : initialData ? "שמירה" : "יצירה"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
