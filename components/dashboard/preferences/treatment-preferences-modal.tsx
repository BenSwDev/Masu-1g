"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/common/ui/modal"
import { DialogFooter } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { updateTreatmentPreferences } from "@/actions/preferences-actions"
import { useTranslation } from "@/lib/translations/i18n"
import type { ITreatmentPreferences } from "@/lib/db/models/user"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils/utils"

interface TreatmentPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  currentPreferences: ITreatmentPreferences | undefined
}

const defaultPrefs: ITreatmentPreferences = { therapistGender: "any" }

export function TreatmentPreferencesModal({ isOpen, onClose, currentPreferences }: TreatmentPreferencesModalProps) {
  const [selectedGender, setSelectedGender] = useState<ITreatmentPreferences["therapistGender"]>(
    currentPreferences?.therapistGender || defaultPrefs.therapistGender,
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { _data: session, update: updateSession } = useSession()
  const { t, dir } = useTranslation() // Correctly destructure dir

  useEffect(() => {
    if (isOpen && currentPreferences) {
      setSelectedGender(currentPreferences.therapistGender || defaultPrefs.therapistGender)
    } else if (isOpen && !currentPreferences && session?.user?.treatmentPreferences) {
      setSelectedGender(session.user.treatmentPreferences.therapistGender || defaultPrefs.therapistGender)
    } else if (isOpen) {
      setSelectedGender(defaultPrefs.therapistGender)
    }
  }, [isOpen, currentPreferences, session?.user?.treatmentPreferences])

  const handleSave = async () => {
    setIsLoading(true)
    const result = await updateTreatmentPreferences({ therapistGender: selectedGender })
    if (result.success && result.treatmentPreferences) {
      toast({ title: t("common.success"), description: t("preferences.treatment.saveSuccess") })
      await updateSession({ treatmentPreferences: result.treatmentPreferences })
      onClose()
    } else {
      toast({
        title: t("common.error"),
        description: result.message || t("preferences.treatment.saveError"),
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("preferences.treatment.title")}
      description={t("preferences.treatment.description")}
    >
      <div className="py-4">
        <Label htmlFor="therapistGender" className={cn(dir === "rtl" ? "text-right block" : "text-left block")}>
          {t("preferences.treatment.therapistGenderLabel")}
        </Label>
        <RadioGroup
          id="therapistGender"
          value={selectedGender}
          onValueChange={(value: ITreatmentPreferences["therapistGender"]) => setSelectedGender(value)}
          className="mt-2 space-y-2"
          dir={dir}
        >
          <div
            className={cn("flex items-center gap-2", dir === "rtl" ? "flex-row-reverse justify-end" : "justify-start")}
          >
            <RadioGroupItem value="male" id="gender-male" />
            <Label htmlFor="gender-male">{t("preferences.treatment.genderMale")}</Label>
          </div>
          <div
            className={cn("flex items-center gap-2", dir === "rtl" ? "flex-row-reverse justify-end" : "justify-start")}
          >
            <RadioGroupItem value="female" id="gender-female" />
            <Label htmlFor="gender-female">{t("preferences.treatment.genderFemale")}</Label>
          </div>
          <div
            className={cn("flex items-center gap-2", dir === "rtl" ? "flex-row-reverse justify-end" : "justify-start")}
          >
            <RadioGroupItem value="any" id="gender-any" />
            <Label htmlFor="gender-any">{t("preferences.treatment.genderAny")}</Label>
          </div>
        </RadioGroup>
      </div>
      <DialogFooter className={cn(dir === "rtl" ? "flex-row-reverse" : "")}>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? t("common.saving") : t("common.savePreferences")}
        </Button>
      </DialogFooter>
    </Modal>
  )
}
