"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, Globe, Bell, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserNotificationPreferences } from "@/actions/notification-service"
import type { INotificationPreferences } from "@/lib/db/models/user"

// ➕ Enhanced notification preferences matching new booking schema
interface NotificationPreferencesSelectorProps {
  value: {
    methods: ("email" | "sms")[]
    language: "he" | "en" | "ru"
    alertPreference?: "sms" | "email" | "none"
  }
  onChange: (preferences: {
    methods: ("email" | "sms")[]
    language: "he" | "en" | "ru"
    alertPreference?: "sms" | "email" | "none"
  }) => void
  isForRecipient?: boolean
  recipientName?: string
  disabled?: boolean
  className?: string
  // ➕ New props for enhanced functionality
  showAlertPreferences?: boolean
  title?: string
}

export default function NotificationPreferencesSelector({ 
  value, 
  onChange, 
  isForRecipient = false, 
  recipientName,
  disabled = false,
  className,
  // ➕ New props
  showAlertPreferences = false,
  title
}: NotificationPreferencesSelectorProps) {
  const { t, dir, language } = useTranslation()
  const { data: session } = useSession()
  const [userPreferences, setUserPreferences] = useState<INotificationPreferences | null>(null)
  const [isLoadingUserPrefs, setIsLoadingUserPrefs] = useState(false)

  // Load user's default preferences when component mounts
  useEffect(() => {
    if (session?.user?.id && !isForRecipient) {
      loadUserPreferences()
    }
  }, [session?.user?.id, isForRecipient])

  const loadUserPreferences = async () => {
    if (!session?.user?.id) return

    setIsLoadingUserPrefs(true)
    try {
      const result = await getUserNotificationPreferences(session.user.id)
      if (result.success && result.preferences) {
        setUserPreferences(result.preferences)
        // Auto-populate form with user's preferences if not already set
        if (value.methods.length === 1 && value.methods[0] === "email") {
          onChange({
            methods: result.preferences.methods,
            language: result.preferences.language
          })
        }
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error)
    } finally {
      setIsLoadingUserPrefs(false)
    }
  }

  const handleMethodChange = (method: "email" | "sms", checked: boolean) => {
    const newMethods = checked 
      ? [...value.methods, method]
      : value.methods.filter(m => m !== method)
    
    // Ensure at least one method is selected
    if (newMethods.length === 0) {
      return // Don't allow empty selection
    }

    onChange({
      ...value,
      methods: newMethods
    })
  }

  const handleLanguageChange = (language: "he" | "en" | "ru") => {
    onChange({
      ...value,
      language
    })
  }

  // ➕ Handle alert preference changes
  const handleAlertPreferenceChange = (alertPreference: "sms" | "email" | "none") => {
    onChange({
      ...value,
      alertPreference
    })
  }

  const useUserDefaults = () => {
    if (userPreferences) {
      onChange({
        methods: userPreferences.methods,
        language: userPreferences.language
      })
    }
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "he": return t("languages.hebrew") || "עברית"
      case "en": return t("languages.english") || "English"
      case "ru": return t("languages.russian") || "Русский"
      default: return lang
    }
  }

  const displayTitle = title || (isForRecipient 
    ? `${t("notifications.recipientTitle") || "העדפות התראה עבור"} ${recipientName || t("notifications.recipient") || "הנמען"}`
    : t("notifications.yourTitle") || "העדפות התראה עבורך")

  const description = isForRecipient
    ? t("notifications.recipientDescription") || "בחר כיצד הנמען ירצה לקבל את האישורים והעדכונים על ההזמנה"
    : t("notifications.yourDescription") || "בחר כיצד תרצה לקבל את האישורים והעדכונים על ההזמנה"

  return (
    <Card className={className} dir={dir}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-base ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          <Bell className="h-4 w-4" />
          {displayTitle}
        </CardTitle>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Show user's default preferences hint */}
        {userPreferences && !isForRecipient && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t("notifications.defaultPreferences") || "העדפות ברירת המחדל שלך"}: {userPreferences.methods.map(m => m === "email" ? t("notifications.email") || "אימייל" : t("notifications.sms") || "SMS").join(" + ")} 
              {" "}({getLanguageLabel(userPreferences.language)})
              {(value.methods.join(",") !== userPreferences.methods.join(",") || value.language !== userPreferences.language) && (
                <button
                  type="button"
                  onClick={useUserDefaults}
                  className={`text-blue-600 hover:text-blue-800 underline ${dir === "rtl" ? "mr-2" : "ml-2"}`}
                  disabled={disabled}
                >
                  {t("notifications.useDefaults") || "השתמש בברירת המחדל"}
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Communication Methods */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("notifications.communicationMethods") || "אמצעי תקשורת"}</Label>
          
          <div className="space-y-2">
            <div className={`flex items-center space-x-3 ${dir === "rtl" ? "space-x-reverse flex-row-reverse" : ""}`}>
              <Checkbox
                id={isForRecipient ? "recipient-email-method" : "email-method"}
                checked={value.methods.includes("email")}
                onCheckedChange={(checked) => handleMethodChange("email", checked as boolean)}
                disabled={disabled}
              />
              <Label 
                htmlFor={isForRecipient ? "recipient-email-method" : "email-method"}
                className={`flex items-center gap-2 cursor-pointer text-sm ${dir === "rtl" ? "flex-row-reverse" : ""}`}
              >
                <Mail className="h-4 w-4" />
                {t("notifications.email") || "דואר אלקטרוני"}
                {value.methods.includes("email") && (
                  <Badge variant="default" className="text-xs">{t("notifications.active") || "פעיל"}</Badge>
                )}
              </Label>
            </div>
            
            <div className={`flex items-center space-x-3 ${dir === "rtl" ? "space-x-reverse flex-row-reverse" : ""}`}>
              <Checkbox
                id={isForRecipient ? "recipient-sms-method" : "sms-method"}
                checked={value.methods.includes("sms")}
                onCheckedChange={(checked) => handleMethodChange("sms", checked as boolean)}
                disabled={disabled}
              />
              <Label 
                htmlFor={isForRecipient ? "recipient-sms-method" : "sms-method"}
                className={`flex items-center gap-2 cursor-pointer text-sm ${dir === "rtl" ? "flex-row-reverse" : ""}`}
              >
                <MessageSquare className="h-4 w-4" />
                {t("notifications.sms") || "הודעות טקסט (SMS)"}
                {value.methods.includes("sms") && (
                  <Badge variant="default" className="text-xs">{t("notifications.active") || "פעיל"}</Badge>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label className={`text-sm font-medium flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <Globe className="h-4 w-4" />
            {t("notifications.language") || "שפת התקשורת"}
          </Label>
          <Select value={value.language} onValueChange={handleLanguageChange} disabled={disabled}>
            <SelectTrigger dir={dir} lang={language}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir} lang={language}>
              <SelectItem value="he">{t("languages.hebrew") || "עברית"}</SelectItem>
              <SelectItem value="en">{t("languages.english") || "English"}</SelectItem>
              <SelectItem value="ru">{t("languages.russian") || "Русский"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert Preferences (Enhanced) */}
        {showAlertPreferences && (
          <div className="space-y-2 border-t pt-4">
            <Label className={`text-sm font-medium flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <Bell className="h-4 w-4" />
              {t("notifications.alertPreferences") || "העדפות התראה"}
            </Label>
            <Select 
              value={value.alertPreference || "none"} 
              onValueChange={handleAlertPreferenceChange}
              disabled={disabled}
            >
              <SelectTrigger dir={dir} lang={language}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={dir} lang={language}>
                <SelectItem value="none">{t("notifications.noAlerts") || "ללא התראות"}</SelectItem>
                <SelectItem value="email">{t("notifications.emailOnly") || "אימייל בלבד"}</SelectItem>
                <SelectItem value="sms">{t("notifications.smsOnly") || "SMS בלבד"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Method selection validation */}
        {value.methods.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm text-orange-600">
              {t("notifications.selectAtLeastOne") || "נא לבחור לפחות אמצעי תקשורת אחד"}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 