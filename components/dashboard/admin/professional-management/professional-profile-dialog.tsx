"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"
import { getProfessionalById, updateProfessionalStatus } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

interface ProfessionalProfileDialogProps {
  professionalId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProfessionalDetails {
  id: string
  name: string | null
  email: string | null
  phone?: string | null
  professionalNumber: string
  status: ProfessionalStatus
}

export function ProfessionalProfileDialog({ professionalId, open, onOpenChange }: ProfessionalProfileDialogProps) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<ProfessionalDetails | null>(null)
  const [status, setStatus] = useState<ProfessionalStatus>("pending_admin_approval")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && professionalId) {
      getProfessionalById(professionalId).then((res) => {
        if (res.success && res.professional) {
          const user = res.professional.userId as IUser
          setProfile({
            id: res.professional._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || undefined,
            professionalNumber: res.professional._id.toString(),
            status: res.professional.status
          })
          setStatus(res.professional.status)
        }
      })
    } else {
      setProfile(null)
    }
  }, [open, professionalId])

  async function handleSave() {
    if (!professionalId) return
    setLoading(true)
    const result = await updateProfessionalStatus(professionalId, status)
    setLoading(false)
    if (result.success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.professionals.dialog.title")}</DialogTitle>
        </DialogHeader>
        {profile && (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
            </div>
            <Separator />
            <div className="space-y-2">
              <div>
                <span className="font-medium">{t("admin.professionals.dialog.numberLabel")}: </span>
                {profile.professionalNumber}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {t("admin.professionals.dialog.statusLabel")}
                </label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProfessionalStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {t("admin.professionals.statuses.active")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("admin.professionals.statuses.inactive")}
                    </SelectItem>
                    <SelectItem value="pending_admin_approval">
                      {t("admin.professionals.statuses.pending")}
                    </SelectItem>
                    <SelectItem value="pending_user_action">
                      {t("admin.professionals.statuses.incomplete")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {t("admin.professionals.statuses.rejected")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="mt-4">
              {t("common.save")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

