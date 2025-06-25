"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Calendar } from "@/components/common/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { CalendarIcon, User, UserPlus } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface BookingCreateCustomerStepProps {
  formData: any
  onUpdate: (data: any) => void
  onNext: () => void
}

export default function BookingCreateCustomerStep({
  formData,
  onUpdate,
  onNext
}: BookingCreateCustomerStepProps) {
  const { t, dir } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (formData.customerType === "guest") {
      if (!formData.guestInfo?.firstName) {
        newErrors.firstName = "שם פרטי נדרש"
      }
      if (!formData.guestInfo?.lastName) {
        newErrors.lastName = "שם משפחה נדרש"
      }
      // Email is now optional in the phone-auth system
      // if (!formData.guestInfo?.email) {
      //   newErrors.email = "אימייל נדרש"
      // }
      if (!formData.guestInfo?.phone) {
        newErrors.phone = "טלפון נדרש"
      }

      if (formData.isBookingForSomeoneElse) {
        if (!formData.recipientInfo?.firstName) {
          newErrors.recipientFirstName = "שם פרטי של המטופל נדרש"
        }
        if (!formData.recipientInfo?.lastName) {
          newErrors.recipientLastName = "שם משפחה של המטופל נדרש"
        }
        if (!formData.recipientInfo?.phone) {
          newErrors.recipientPhone = "טלפון של המטופל נדרש"
        }
      }
    } else if (formData.customerType === "existing") {
      if (!formData.existingCustomerId) {
        newErrors.existingCustomerId = "יש לבחור לקוח קיים"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      onNext()
    }
  }

  const updateGuestInfo = (field: string, value: any) => {
    onUpdate({
      guestInfo: {
        ...formData.guestInfo,
        [field]: value
      }
    })
  }

  const updateRecipientInfo = (field: string, value: any) => {
    onUpdate({
      recipientInfo: {
        ...formData.recipientInfo,
        [field]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            פרטי לקוח
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Type Selection */}
          <div className="space-y-3">
            <Label>סוג לקוח</Label>
            <RadioGroup
              value={formData.customerType}
              onValueChange={(value) => onUpdate({ customerType: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guest" id="guest" />
                <Label htmlFor="guest">לקוח חדש</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing">לקוח קיים</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Guest Customer Form */}
          {formData.customerType === "guest" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">שם פרטי *</Label>
                  <Input
                    id="firstName"
                    value={formData.guestInfo?.firstName || ""}
                    onChange={(e) => updateGuestInfo("firstName", e.target.value)}
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">שם משפחה *</Label>
                  <Input
                    id="lastName"
                    value={formData.guestInfo?.lastName || ""}
                    onChange={(e) => updateGuestInfo("lastName", e.target.value)}
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.guestInfo?.email || ""}
                    onChange={(e) => updateGuestInfo("email", e.target.value)}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input
                    id="phone"
                    value={formData.guestInfo?.phone || ""}
                    onChange={(e) => updateGuestInfo("phone", e.target.value)}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תאריך לידה</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.guestInfo?.birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.guestInfo?.birthDate ? (
                          format(formData.guestInfo.birthDate, "PPP")
                        ) : (
                          "בחר תאריך"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.guestInfo?.birthDate}
                        onSelect={(date) => updateGuestInfo("birthDate", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>מגדר</Label>
                  <Select
                    value={formData.guestInfo?.gender || ""}
                    onValueChange={(value) => updateGuestInfo("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מגדר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">זכר</SelectItem>
                      <SelectItem value="female">נקבה</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Existing Customer Selection */}
          {formData.customerType === "existing" && (
            <div className="space-y-2">
              <Label htmlFor="existingCustomer">בחר לקוח קיים *</Label>
              <Select
                value={formData.existingCustomerId || ""}
                onValueChange={(value) => onUpdate({ existingCustomerId: value })}
              >
                <SelectTrigger className={errors.existingCustomerId ? "border-red-500" : ""}>
                  <SelectValue placeholder="חפש ובחר לקוח..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer1">יוסי כהן - 050-1234567</SelectItem>
                  <SelectItem value="customer2">שרה לוי - 052-9876543</SelectItem>
                  <SelectItem value="customer3">דוד רוזן - 054-5555555</SelectItem>
                </SelectContent>
              </Select>
              {errors.existingCustomerId && (
                <p className="text-sm text-red-500">{errors.existingCustomerId}</p>
              )}
            </div>
          )}

          {/* Booking for Someone Else */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bookingForSomeoneElse"
              checked={formData.isBookingForSomeoneElse}
              onCheckedChange={(checked) => onUpdate({ isBookingForSomeoneElse: checked })}
            />
            <Label htmlFor="bookingForSomeoneElse">ההזמנה היא עבור מישהו אחר</Label>
          </div>

          {/* Recipient Info */}
          {formData.isBookingForSomeoneElse && (
            <Card className="p-4 bg-blue-50">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                פרטי המטופל
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientFirstName">שם פרטי *</Label>
                    <Input
                      id="recipientFirstName"
                      value={formData.recipientInfo?.firstName || ""}
                      onChange={(e) => updateRecipientInfo("firstName", e.target.value)}
                      className={errors.recipientFirstName ? "border-red-500" : ""}
                    />
                    {errors.recipientFirstName && (
                      <p className="text-sm text-red-500">{errors.recipientFirstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientLastName">שם משפחה *</Label>
                    <Input
                      id="recipientLastName"
                      value={formData.recipientInfo?.lastName || ""}
                      onChange={(e) => updateRecipientInfo("lastName", e.target.value)}
                      className={errors.recipientLastName ? "border-red-500" : ""}
                    />
                    {errors.recipientLastName && (
                      <p className="text-sm text-red-500">{errors.recipientLastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone">טלפון *</Label>
                    <Input
                      id="recipientPhone"
                      value={formData.recipientInfo?.phone || ""}
                      onChange={(e) => updateRecipientInfo("phone", e.target.value)}
                      className={errors.recipientPhone ? "border-red-500" : ""}
                    />
                    {errors.recipientPhone && (
                      <p className="text-sm text-red-500">{errors.recipientPhone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">אימייל</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={formData.recipientInfo?.email || ""}
                      onChange={(e) => updateRecipientInfo("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>תאריך לידה</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.recipientInfo?.birthDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recipientInfo?.birthDate ? (
                            format(formData.recipientInfo.birthDate, "PPP")
                          ) : (
                            "בחר תאריך"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.recipientInfo?.birthDate}
                          onSelect={(date) => updateRecipientInfo("birthDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>מגדר</Label>
                    <Select
                      value={formData.recipientInfo?.gender || ""}
                      onValueChange={(value) => updateRecipientInfo("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מגדר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">זכר</SelectItem>
                        <SelectItem value="female">נקבה</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button onClick={handleNext}>
          המשך
        </Button>
      </div>
    </div>
  )
} 