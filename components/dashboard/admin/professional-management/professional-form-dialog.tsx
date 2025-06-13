"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { createProfessional } from "@/actions/professional-actions"
import { useTranslation } from "@/lib/translations/i18n"

interface ProfessionalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfessionalFormDialog({ open, onOpenChange }: ProfessionalFormDialogProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoading(true)
    const result = await createProfessional(formData)
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
          <DialogTitle>{t("admin.professionals.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" placeholder={t("admin.professionals.form.namePlaceholder")}
            aria-label={t("admin.professionals.form.name")}
          />
          <Input name="email" type="email" placeholder={t("admin.professionals.form.emailPlaceholder")}
            aria-label={t("admin.professionals.form.email")}
          />
          <Input name="phone" placeholder={t("admin.professionals.form.phonePlaceholder")}
            aria-label={t("admin.professionals.form.phone")}
          />
          <Input name="password" type="password" placeholder={t("admin.professionals.form.passwordPlaceholder")}
            aria-label={t("admin.professionals.form.password")}
          />
          <Button type="submit" disabled={loading}>
            {t("common.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
