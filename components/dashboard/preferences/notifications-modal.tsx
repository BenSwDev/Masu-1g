"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/common/ui/modal"
import { DialogFooter } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { updateNotificationPreferences } from "@/actions/preferences-actions"
import { useTranslation } from "@/lib/translations/i18n" // Import useTranslation
import type { INotificationPreferences } from "@/lib/db/models/user"
import { useSession } from "next-auth/react"

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  currentPreferences: INotificationPreferences | undefined
}

const defaultPrefs: INotificationPreferences = { methods: ["email", "sms"], language: "he" }

export function NotificationsModal({ isOpen, onClose, currentPreferences }: NotificationsModalProps) {
  const [selectedMethods, setSelectedMethods] = useState<INotificationPreferences["methods"]>(
    currentPreferences?.methods || defaultPrefs.methods,
  )
  const [selectedLanguage, setSelectedLanguage] = useState<INotificationPreferences["language"]>(
    currentPreferences?.language || defaultPrefs.language,
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { data: session, update: updateSession } = useSession()
  const { t } = useTranslation() // Initialize useTranslation

  useEffect(() => {
    if (isOpen && currentPreferences) {
      setSelectedMethods(currentPreferences.methods.length > 0 ? currentPreferences.methods : defaultPrefs.methods)
      setSelectedLanguage(currentPreferences.language || defaultPrefs.language)
    } else if (isOpen && !currentPreferences && session?.user?.notificationPreferences) {
      setSelectedMethods(
        session.user.notificationPreferences.methods.length > 0
          ? session.user.notificationPreferences.methods
          : defaultPrefs.methods,
      )
      setSelectedLanguage(session.user.notificationPreferences.language || defaultPrefs.language)
    } else if (isOpen) {
      setSelectedMethods(defaultPrefs.methods)
      setSelectedLanguage(defaultPrefs.language)
    }
  }, [isOpen, currentPreferences, session?.user?.notificationPreferences])

  const handleMethodChange = (method: "email" | "sms") => {
    setSelectedMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]))
  }

  const handleSave = async () => {
    if (selectedMethods.length === 0) {
      toast({
        title: t("common.validationError"),
        variant: "destructive",
        description: t("preferences.notifications.errorMinMethods"),
      })
      return
    }
    setIsLoading(true)
    const result = await updateNotificationPreferences({
      methods: selectedMethods,
      language: selectedLanguage,
    })
    if (result.success && result.notificationPreferences) {
      toast({ title: t("common.success"), description: t("preferences.notifications.saveSuccess") })
      await updateSession({ notificationPreferences: result.notificationPreferences }) // Update session
      onClose()
    } else {
      toast({
        title: t("common.error"),
        description: result.message || t("preferences.notifications.saveError"),
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("preferences.notifications.title")}
      description={t("preferences.notifications.description")}
    >
      <div className="py-4 space-y-6">
        <div>
          <Label>{t("preferences.notifications.methodsLabel")}</Label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="method-email"
                checked={selectedMethods.includes("email")}
                onCheckedChange={() => handleMethodChange("email")}
              />
              <Label htmlFor="method-email">{t("preferences.notifications.methodEmail")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="method-sms"
                checked={selectedMethods.includes("sms")}
                onCheckedChange={() => handleMethodChange("sms")}
              />
              <Label htmlFor="method-sms">{t("preferences.notifications.methodSms")}</Label>
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="notificationLanguage">{t("preferences.notifications.languageLabel")}</Label>
          <RadioGroup
            id="notificationLanguage"
            value={selectedLanguage}
            onValueChange={(value: INotificationPreferences["language"]) => setSelectedLanguage(value)}
            className="mt-2 space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="he" id="lang-he" />
              <Label htmlFor="lang-he">{t("preferences.notifications.langHe")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en">{t("preferences.notifications.langEn")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ru" id="lang-ru" />
              <Label htmlFor="lang-ru">{t("preferences.notifications.langRu")}</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? t("common.saving") : t("common.saveSettings")}
        </Button>
      </DialogFooter>
    </Modal>
  )
}
