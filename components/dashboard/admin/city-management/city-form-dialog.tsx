"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Checkbox } from "@/components/common/ui/checkbox"
import { createCity } from "@/actions/city-actions"
import { useTranslation } from "@/lib/translations/i18n"

interface CityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CityFormDialog({ open, onOpenChange }: CityFormDialogProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoading(true)
    const result = await createCity(formData)
    setLoading(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.cities.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" placeholder={t("admin.cities.form.name") as string} aria-label={t("admin.cities.form.name") as string} />
          <Input name="lat" placeholder={t("admin.cities.form.lat") as string} aria-label={t("admin.cities.form.lat") as string} />
          <Input name="lng" placeholder={t("admin.cities.form.lng") as string} aria-label={t("admin.cities.form.lng") as string} />
          <div className="flex items-center space-x-2">
            <Checkbox name="isActive" value="true" defaultChecked />
            <label htmlFor="isActive">{t("admin.cities.form.active")}</label>
          </div>
          <Button type="submit" disabled={loading}>{t("common.save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
