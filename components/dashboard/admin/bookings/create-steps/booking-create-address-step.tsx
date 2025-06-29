"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, ArrowLeft, Home } from "lucide-react"
import { CitySelectForm } from "@/components/ui/city-select-form"

interface BookingCreateAddressStepProps {
  formData: any
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export default function BookingCreateAddressStep({
  formData,
  onUpdate,
  onNext,
  onPrev
}: BookingCreateAddressStepProps) {
  const { t, dir } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (formData.addressType === "custom") {
      if (!formData.customAddress?.city) {
        newErrors.city = "עיר נדרשת"
      }
      if (!formData.customAddress?.street) {
        newErrors.street = "רחוב נדרש"
      }
      if (!formData.customAddress?.houseNumber) {
        newErrors.houseNumber = "מספר בית נדרש"
      }
    } else if (formData.addressType === "existing" && !formData.addressId) {
      newErrors.addressId = "יש לבחור כתובת קיימת"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      onNext()
    }
  }

  const updateCustomAddress = (field: string, value: any) => {
    onUpdate({
      customAddress: {
        ...formData.customAddress,
        [field]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            כתובת הטיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Address Type Selection */}
          <div className="space-y-3">
            <Label>סוג כתובת</Label>
            <RadioGroup
              value={formData.addressType}
              onValueChange={(value) => onUpdate({ addressType: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing">כתובת קיימת</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">כתובת חדשה</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Existing Address Selection */}
          {formData.addressType === "existing" && (
            <div className="space-y-2">
              <Label htmlFor="existingAddress">בחר כתובת קיימת *</Label>
              <Select
                value={formData.addressId || ""}
                onValueChange={(value) => onUpdate({ addressId: value })}
              >
                <SelectTrigger className={errors.addressId ? "border-red-500" : ""}>
                  <SelectValue placeholder="בחר כתובת..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="address1">דיזנגוף 123, תל אביב</SelectItem>
                  <SelectItem value="address2">הרצל 45, ירושלים</SelectItem>
                  <SelectItem value="address3">הנביאים 67, חיפה</SelectItem>
                </SelectContent>
              </Select>
              {errors.addressId && (
                <p className="text-sm text-red-500">{errors.addressId}</p>
              )}
            </div>
          )}

          {/* Custom Address Form */}
          {formData.addressType === "custom" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">עיר *</Label>
                  <CitySelectForm
                    value={formData.customAddress?.city || ""}
                    onValueChange={(value) => updateCustomAddress("city", value)}
                    placeholder="בחר עיר..."
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">רחוב *</Label>
                  <Input
                    id="street"
                    value={formData.customAddress?.street || ""}
                    onChange={(e) => updateCustomAddress("street", e.target.value)}
                    className={errors.street ? "border-red-500" : ""}
                    placeholder="שם הרחוב"
                  />
                  {errors.street && (
                    <p className="text-sm text-red-500">{errors.street}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">מספר בית *</Label>
                  <Input
                    id="houseNumber"
                    value={formData.customAddress?.houseNumber || ""}
                    onChange={(e) => updateCustomAddress("houseNumber", e.target.value)}
                    className={errors.houseNumber ? "border-red-500" : ""}
                    placeholder="123"
                  />
                  {errors.houseNumber && (
                    <p className="text-sm text-red-500">{errors.houseNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartmentNumber">מספר דירה</Label>
                  <Input
                    id="apartmentNumber"
                    value={formData.customAddress?.apartmentNumber || ""}
                    onChange={(e) => updateCustomAddress("apartmentNumber", e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">קומה</Label>
                  <Input
                    id="floor"
                    value={formData.customAddress?.floor || ""}
                    onChange={(e) => updateCustomAddress("floor", e.target.value)}
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entrance">כניסה</Label>
                <Input
                  id="entrance"
                  value={formData.customAddress?.entrance || ""}
                  onChange={(e) => updateCustomAddress("entrance", e.target.value)}
                  placeholder="כניסה א'"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות נוספות</Label>
                <Textarea
                  id="notes"
                  value={formData.customAddress?.notes || ""}
                  onChange={(e) => updateCustomAddress("notes", e.target.value)}
                  placeholder="הערות לגבי הגעה, חניה, קוד דיגיטלי וכו'"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parking"
                  checked={formData.customAddress?.parking || false}
                  onCheckedChange={(checked) => updateCustomAddress("parking", checked)}
                />
                <Label htmlFor="parking">יש חניה זמינה</Label>
              </div>
            </div>
          )}

          {/* Address Summary */}
          {((formData.addressType === "custom" && formData.customAddress?.city && formData.customAddress?.street && formData.customAddress?.houseNumber) ||
            (formData.addressType === "existing" && formData.addressId)) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  סיכום כתובת
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.addressType === "custom" ? (
                  <>
                    <div className="flex justify-between">
                      <span>כתובת:</span>
                      <span className="font-medium">
                        {formData.customAddress?.street} {formData.customAddress?.houseNumber}
                        {formData.customAddress?.apartmentNumber && `, דירה ${formData.customAddress.apartmentNumber}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>עיר:</span>
                      <span className="font-medium">{formData.customAddress?.city}</span>
                    </div>
                    {formData.customAddress?.floor && (
                      <div className="flex justify-between">
                        <span>קומה:</span>
                        <span className="font-medium">{formData.customAddress.floor}</span>
                      </div>
                    )}
                    {formData.customAddress?.entrance && (
                      <div className="flex justify-between">
                        <span>כניסה:</span>
                        <span className="font-medium">{formData.customAddress.entrance}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>חניה:</span>
                      <span className="font-medium">
                        {formData.customAddress?.parking ? "זמינה" : "לא זמינה"}
                      </span>
                    </div>
                    {formData.customAddress?.notes && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm">
                          <strong>הערות:</strong> {formData.customAddress.notes}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>כתובת נבחרת:</span>
                    <span className="font-medium">
                      {formData.addressId === "address1" && "דיזנגוף 123, תל אביב"}
                      {formData.addressId === "address2" && "הרצל 45, ירושלים"}
                      {formData.addressId === "address3" && "הנביאים 67, חיפה"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Service Area Info */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">אזורי שירות:</h4>
              <div className="text-sm space-y-1">
                <p>• גוש דן (תל אביב והסביבה)</p>
                <p>• ירושלים והסביבה</p>
                <p>• חיפה והקריות</p>
                <p>• באר שבע</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                * עלות נוספת של 25 ש"ח עבור נסיעות מעל 15 ק"מ מהעיר המרכזית
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <Button onClick={handleNext}>
          המשך
        </Button>
      </div>
    </div>
  )
} 
