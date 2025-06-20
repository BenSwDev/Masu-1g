"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
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
      case "he": return "עברית"
      case "en": return "English"
      case "ru": return "Русский"
      default: return lang
    }
  }

  const displayTitle = title || (isForRecipient 
    ? `העדפות התראה עבור ${recipientName || 'הנמען'}`
    : "העדפות התראה עבורך")

  const description = isForRecipient
    ? "בחר כיצד הנמען ירצה לקבל את האישורים והעדכונים על ההזמנה"
    : "בחר כיצד תרצה לקבל את האישורים והעדכונים על ההזמנה"

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
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
              העדפות ברירת המחדל שלך: {userPreferences.methods.map(m => m === "email" ? "אימייל" : "SMS").join(" + ")} 
              {" "}({getLanguageLabel(userPreferences.language)})
              {(value.methods.join(",") !== userPreferences.methods.join(",") || value.language !== userPreferences.language) && (
                <button
                  type="button"
                  onClick={useUserDefaults}
                  className="text-blue-600 hover:text-blue-800 underline ml-2"
                  disabled={disabled}
                >
                  השתמש בברירת המחדל
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Communication Methods */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">אמצעי תקשורת</Label>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox
                id={isForRecipient ? "recipient-email-method" : "email-method"}
                checked={value.methods.includes("email")}
                onCheckedChange={(checked) => handleMethodChange("email", checked as boolean)}
                disabled={disabled}
              />
              <Label 
                htmlFor={isForRecipient ? "recipient-email-method" : "email-method"}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Mail className="h-4 w-4" />
                דואר אלקטרוני
                {value.methods.includes("email") && (
                  <Badge variant="default" className="text-xs">פעיל</Badge>
                )}
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox
                id={isForRecipient ? "recipient-sms-method" : "sms-method"}
                checked={value.methods.includes("sms")}
                onCheckedChange={(checked) => handleMethodChange("sms", checked as boolean)}
                disabled={disabled}
              />
              <Label 
                htmlFor={isForRecipient ? "recipient-sms-method" : "sms-method"}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <MessageSquare className="h-4 w-4" />
                הודעות SMS
                {value.methods.includes("sms") && (
                  <Badge variant="default" className="text-xs">פעיל</Badge>
                )}
              </Label>
            </div>
          </div>

          {value.methods.length === 0 && (
            <p className="text-xs text-red-600">
              חובה לבחור לפחות אמצעי תקשורת אחד
            </p>
          )}
        </div>

        {/* Language Preference */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">שפת התראות</Label>
          
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select
              value={value.language}
              onValueChange={(lang: "he" | "en" | "ru") => handleLanguageChange(lang)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he">עברית</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {getLanguageLabel(value.language)}
            </Badge>
          </div>
        </div>

        {/* ➕ Alert Preferences (if enabled) */}
        {showAlertPreferences && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">העדפות התראות</Label>
            
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Select
                value={value.alertPreference || "email"}
                onValueChange={(pref: "sms" | "email" | "none") => handleAlertPreferenceChange(pref)}
                disabled={disabled}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      דואר אלקטרוני
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      ללא התראות
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs">
                {value.alertPreference === "email" ? "אימייל" : 
                 value.alertPreference === "sms" ? "SMS" : "ללא התראות"}
              </Badge>
            </div>
          </div>
        )}

        {/* Current Selection Summary */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">יקבל התראות דרך:</span>
            <div className="flex gap-1">
              {value.methods.map(method => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method === "email" ? "אימייל" : "SMS"}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">בשפה:</span>
            <Badge variant="outline" className="text-xs">
              {getLanguageLabel(value.language)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 