"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, Globe, Bell, Save, CheckCircle } from "lucide-react"
import { getUserNotificationPreferences, updateUserNotificationPreferences } from "@/actions/notification-service"
import type { INotificationPreferences } from "@/lib/db/models/user"

interface NotificationPreferencesProps {
  className?: string
}

export default function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<INotificationPreferences>({
    methods: ["email", "sms"],
    language: "he"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load user preferences on mount
  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences()
    }
  }, [session?.user?.id])

  const loadPreferences = async () => {
    if (!session?.user?.id) return

    try {
      const result = await getUserNotificationPreferences(session.user.id)
      if (result.success && result.preferences) {
        setPreferences(result.preferences)
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error)
      toast.error("שגיאה בטעינת העדפות ההתראות")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMethodChange = (method: "email" | "sms", checked: boolean) => {
    setPreferences(prev => {
      const newMethods = checked 
        ? [...prev.methods, method]
        : prev.methods.filter(m => m !== method)
      
      // Ensure at least one method is selected
      if (newMethods.length === 0) {
        toast.error("חובה לבחור לפחות אמצעי תקשורת אחד")
        return prev
      }

      setHasChanges(true)
      return { ...prev, methods: newMethods }
    })
  }

  const handleLanguageChange = (language: "he" | "en" | "ru") => {
    setPreferences(prev => ({ ...prev, language }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!session?.user?.id || !hasChanges) return

    setIsSaving(true)
    try {
      const result = await updateUserNotificationPreferences(session.user.id, preferences)
      
      if (result.success) {
        toast.success("העדפות ההתראות נשמרו בהצלחה")
        setHasChanges(false)
      } else {
        toast.error(result.message || "שגיאה בשמירת העדפות")
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error)
      toast.error("שגיאה בשמירת העדפות")
    } finally {
      setIsSaving(false)
    }
  }

  const getMethodBadgeVariant = (method: "email" | "sms") => {
    return preferences.methods.includes(method) ? "default" : "outline"
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "he": return "עברית"
      case "en": return "English"
      case "ru": return "Русский"
      default: return lang
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            העדפות התראות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          העדפות התראות
        </CardTitle>
        <CardDescription>
          בחר כיצד ובאיזו שפה תרצה לקבל התראות מהמערכת
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Communication Methods */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">אמצעי תקשורת</Label>
            <p className="text-sm text-muted-foreground mt-1">
              בחר דרכי התקשורת שבהן תרצה לקבל התראות
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="email-method"
                checked={preferences.methods.includes("email")}
                onCheckedChange={(checked) => handleMethodChange("email", checked as boolean)}
              />
              <Label 
                htmlFor="email-method" 
                className="flex items-center gap-2 cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                דואר אלקטרוני
                <Badge variant={getMethodBadgeVariant("email")} className="text-xs">
                  {preferences.methods.includes("email") ? "פעיל" : "כבוי"}
                </Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="sms-method"
                checked={preferences.methods.includes("sms")}
                onCheckedChange={(checked) => handleMethodChange("sms", checked as boolean)}
              />
              <Label 
                htmlFor="sms-method" 
                className="flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                הודעות SMS
                <Badge variant={getMethodBadgeVariant("sms")} className="text-xs">
                  {preferences.methods.includes("sms") ? "פעיל" : "כבוי"}
                </Badge>
              </Label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <strong>טיפ:</strong> מומלץ להשאיר שני האמצעים פעילים כדי לוודא שתקבל את כל ההתראות החשובות
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Language Preference */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">שפת התראות</Label>
            <p className="text-sm text-muted-foreground mt-1">
              בחר את השפה שבה תרצה לקבל את ההתראות
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select
              value={preferences.language}
              onValueChange={(value: "he" | "en" | "ru") => handleLanguageChange(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he">עברית</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">
              {getLanguageLabel(preferences.language)}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Current Settings Summary */}
        <div className="space-y-3">
          <Label className="text-base font-medium">סיכום הגדרות נוכחיות</Label>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">אמצעי תקשורת:</span>
              <div className="flex gap-1">
                {preferences.methods.map(method => (
                  <Badge key={method} variant="default" className="text-xs">
                    {method === "email" ? "אימייל" : "SMS"}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">שפה:</span>
              <Badge variant="secondary" className="text-xs">
                {getLanguageLabel(preferences.language)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  שמור העדפות
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 