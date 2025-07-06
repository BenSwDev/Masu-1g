"use client"

import { useState, memo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { CreditCard, Save, Loader2 } from "lucide-react"
import { updateProfessionalBankDetails } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalBankDetailsTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
}

function ProfessionalBankDetailsTab({
  professional,
  onUpdate
}: ProfessionalBankDetailsTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [bankDetails, setBankDetails] = useState({
    bankName: professional.bankDetails?.bankName || "",
    branchNumber: professional.bankDetails?.branchNumber || "",
    accountNumber: professional.bankDetails?.accountNumber || ""
  })
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleInputChange = (field: keyof typeof bankDetails, value: string) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    // Basic validation
    if (!bankDetails.bankName.trim() || !bankDetails.branchNumber.trim() || !bankDetails.accountNumber.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא למלא את כל שדות חשבון הבנק"
      })
      return
    }

    setSaving(true)
    
    try {
      const result = await updateProfessionalBankDetails(professional._id, bankDetails)
      
      if (result.success) {
        onUpdate({ bankDetails })
        setHasChanges(false)
        
        toast({
          title: "הצלחה",
          description: "פרטי חשבון הבנק נשמרו בהצלחה"
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון פרטי חשבון הבנק"
        })
      }
    } catch (error) {
      console.error("Error saving bank details:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בשמירת פרטי חשבון הבנק"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            פרטי חשבון בנק
          </h3>
          <p className="text-sm text-muted-foreground">
            הגדר את פרטי חשבון הבנק לתשלומים למטפל
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                שמור שינויים
              </>
            )}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי חשבון הבנק</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">שם הבנק *</Label>
              <Input
                id="bankName"
                value={bankDetails.bankName}
                onChange={(e) => handleInputChange("bankName", e.target.value)}
                placeholder="לדוגמה: בנק הפועלים"
                className="text-right"
                dir={dir}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchNumber">מספר סניף *</Label>
              <Input
                id="branchNumber"
                value={bankDetails.branchNumber}
                onChange={(e) => handleInputChange("branchNumber", e.target.value)}
                placeholder="לדוגמה: 123"
                className="text-right"
                dir={dir}
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">מספר חשבון *</Label>
            <Input
              id="accountNumber"
              value={bankDetails.accountNumber}
              onChange={(e) => handleInputChange("accountNumber", e.target.value)}
              placeholder="לדוגמה: 123456789"
              className="text-right"
              dir={dir}
              maxLength={20}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">חשוב לדעת:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>פרטי חשבון הבנק יישמרו בצורה מוצפנת ובטוחה</li>
                  <li>הפרטים ישמשו לתשלומים שוטפים למטפל</li>
                  <li>ניתן לעדכן את הפרטים בכל עת</li>
                  <li>נא לוודא שהפרטים נכונים לפני השמירה</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Bank Details Summary */}
      {professional.bankDetails && (
        <Card>
          <CardHeader>
            <CardTitle>פרטים נוכחיים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">בנק:</span>
                <div className="text-muted-foreground">{professional.bankDetails.bankName}</div>
              </div>
              <div>
                <span className="font-medium">סניף:</span>
                <div className="text-muted-foreground">{professional.bankDetails.branchNumber}</div>
              </div>
              <div>
                <span className="font-medium">חשבון:</span>
                <div className="text-muted-foreground">
                  {professional.bankDetails.accountNumber.replace(/(.{4})/g, '$1-')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default memo(ProfessionalBankDetailsTab) 