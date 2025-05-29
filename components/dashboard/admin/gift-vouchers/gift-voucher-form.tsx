"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/common/ui/form"
import { Switch } from "@/components/common/ui/switch"
import { createGiftVoucher, updateGiftVoucher } from "@/actions/gift-voucher-actions"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

export interface GiftVoucherPlain {
  _id: string
  code: string
  value: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

interface GiftVoucherFormProps {
  initialData?: GiftVoucherPlain
  onSuccess?: () => void
  onCancel?: () => void
}

const formSchema = z.object({
  code: z.string().min(1, "Code is required"),
  value: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Value must be a positive number",
  }),
  validFrom: z.string().min(1, "Valid from date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  isActive: z.boolean(),
})

export function GiftVoucherForm({
  initialData,
  onSuccess,
  onCancel,
}: GiftVoucherFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      value: initialData?.value?.toString() ?? "",
      validFrom: initialData?.validFrom
        ? format(new Date(initialData.validFrom), "yyyy-MM-dd")
        : "",
      validUntil: initialData?.validUntil
        ? format(new Date(initialData.validUntil), "yyyy-MM-dd")
        : "",
      isActive: initialData?.isActive ?? true,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append("code", values.code)
      formData.append("value", values.value)
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
        title: initialData ? "Gift voucher updated" : "Gift voucher created",
        description: initialData
          ? "The gift voucher has been updated successfully."
          : "The gift voucher has been created successfully.",
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
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
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid From</FormLabel>
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
              <FormLabel>Valid Until</FormLabel>
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
                <FormLabel>Active</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default GiftVoucherForm
