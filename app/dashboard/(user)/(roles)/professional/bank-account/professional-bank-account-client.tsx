"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { CreditCard, Save, Loader2 } from "lucide-react"

interface ProfessionalBankAccountClientProps {
  professional: {
    _id: string
    userId: string
    bankDetails?: {
      bankName?: string
      branchNumber?: string
      accountNumber?: string
    }
    status: string
    isActive: boolean
  }
}

export default function ProfessionalBankAccountClient({ professional }: ProfessionalBankAccountClientProps) {
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
      const response = await fetch('/api/professional/bank-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankDetails),
      })

      const result = await response.json()
      
      if (result.success) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            פרטי חשבון בנק
          </h3>
          <p className="text-sm text-muted-foreground">
            עדכן את פרטי חשבון הבנק שלך לקבלת תשלומים
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
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">מידע חשוב</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• פרטי חשבון הבנק נדרשים לעברת תשלומים עבור הטיפולים שלך</li>
              <li>• אנא וודא שהפרטים נכונים למניעת עיכובים בתשלומים</li>
              <li>• במקרה של שינוי פרטי הבנק, אנא עדכן כאן מיידית</li>
              <li>• התשלומים מועברים אחת לחודש בהתאם למדיניות החברה</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 