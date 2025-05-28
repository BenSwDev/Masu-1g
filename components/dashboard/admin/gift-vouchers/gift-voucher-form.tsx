"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Switch } from "@/components/common/ui/switch"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils/utils"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"

interface GiftVoucherFormProps {
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
  initialData?: IGiftVoucher | null
}

const GiftVoucherForm = ({ onSubmit, isLoading = false, initialData }: GiftVoucherFormProps) => {
  const { t } = useTranslation()
  const [validFrom, setValidFrom] = useState<Date>(initialData ? new Date(initialData.validFrom) : new Date())
  const [validUntil, setValidUntil] = useState<Date>(
    initialData ? new Date(initialData.validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("validFrom", validFrom.toISOString())
    formData.set("validUntil", validUntil.toISOString())
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">{t("giftVouchers.fields.code")}</Label>
          <Input
            id="code"
            name="code"
            defaultValue={initialData?.code || ""}
            required
            placeholder={t("giftVouchers.fields.codePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="value">{t("giftVouchers.fields.value")}</Label>
          <Input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.value || ""}
            required
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("giftVouchers.fields.validFrom")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !validFrom && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {validFrom ? format(validFrom, "PPP") : <span>{t("common.pickDate")}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={validFrom}
                onSelect={(date) => date && setValidFrom(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>{t("giftVouchers.fields.validUntil")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {validUntil ? format(validUntil, "PPP") : <span>{t("common.pickDate")}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={validUntil}
                onSelect={(date) => date && setValidUntil(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="isActive" name="isActive" defaultChecked={initialData?.isActive ?? true} />
        <Label htmlFor="isActive">{t("common.active")}</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving") : initialData ? t("common.update") : t("common.create")}
        </Button>
      </div>
    </form>
  )
}

export default GiftVoucherForm
