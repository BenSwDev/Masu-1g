"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Loader2, CheckCircle, AlertTriangle, Settings, TestTube, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CardcomConfig {
  configured: boolean
  testMode: boolean
  baseUrl: string
  terminal: string
}

export function CardcomSettings() {
  const [config, setConfig] = useState<CardcomConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/payments/cardcom-config')
      const result = await response.json()
      
      if (result.success) {
        setConfig(result.config)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "לא ניתן לטעון הגדרות CARDCOM"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת הגדרות"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateTestMode = async (testMode: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/payments/cardcom-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testMode })
      })

      const result = await response.json()

      if (result.success) {
        setConfig(result.config)
        toast({
          title: "הגדרות עודכנו",
          description: result.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "לא ניתן לעדכן הגדרות"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון הגדרות"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const testConnection = async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/admin/payments/cardcom-config', {
        method: 'PUT'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "בדיקת חיבור הצליחה",
          description: result.message,
        })
      } else {
        toast({
          variant: "destructive",
          title: "בדיקת חיבור נכשלה",
          description: result.error || "לא ניתן להתחבר ל-CARDCOM"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בבדיקת חיבור"
      })
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p>טוען הגדרות CARDCOM...</p>
        </CardContent>
      </Card>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-4" />
          <p>לא ניתן לטעון הגדרות CARDCOM</p>
          <Button onClick={loadConfig} className="mt-4">
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            הגדרות CARDCOM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">סטטוס חיבור</h3>
              <p className="text-sm text-muted-foreground">מצב התחברות לשירות CARDCOM</p>
            </div>
            <div className="flex items-center gap-2">
              {config.configured ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    מחובר
                  </Badge>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">
                    לא מוגדר
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Terminal Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">טרמינל</h3>
              <p className="text-sm text-muted-foreground">מזהה הטרמינל ב-CARDCOM</p>
            </div>
            <Badge variant="outline">
              {config.terminal}
            </Badge>
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                {config.testMode ? (
                  <TestTube className="h-4 w-4 text-blue-500" />
                ) : (
                  <Shield className="h-4 w-4 text-green-500" />
                )}
                מצב פעולה
              </h3>
              <p className="text-sm text-muted-foreground">
                {config.testMode 
                  ? "מצב בדיקה - תשלומים מדומים בלבד" 
                  : "מצב ייצור - תשלומים אמיתיים"
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge 
                variant={config.testMode ? "secondary" : "default"} 
                className={config.testMode ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
              >
                {config.testMode ? "TEST" : "PRODUCTION"}
              </Badge>
              <Switch
                checked={config.testMode}
                onCheckedChange={updateTestMode}
                disabled={isUpdating}
              />
            </div>
          </div>

          {/* Warning for Production Mode */}
          {!config.testMode && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>אזהרה:</strong> המערכת במצב ייצור. כל התשלומים יהיו אמיתיים ויחויבו מהלקוחות.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Mode Notice */}
          {config.testMode && (
            <Alert className="bg-blue-50 border-blue-200">
              <TestTube className="h-4 w-4" />
              <AlertDescription>
                <strong>מצב בדיקה:</strong> התשלומים מדומים ולא יחויבו כסף אמיתי.
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Test */}
          <div className="pt-4 border-t">
            <Button
              onClick={testConnection}
              disabled={isTesting || !config.configured}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  בודק חיבור...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  בדוק חיבור ל-CARDCOM
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>פרטים טכניים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">URL בסיס:</span>
              <p className="text-muted-foreground">{config.baseUrl}</p>
            </div>
            <div>
              <span className="font-medium">מצב אבטחה:</span>
              <p className="text-muted-foreground">
                {config.baseUrl.startsWith('https') ? 'SSL מופעל' : 'SSL לא מופעל'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 