"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { PhoneInput } from "@/components/common/phone-input"
import { requestPhoneChange, confirmPhoneChange } from "@/actions/account-actions"
import { Phone } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { FormControl } from "@/components/common/ui/form"

interface PhoneChangeFormProps {
  currentPhone?: string
  onPhoneChanged?: (newPhone: string) => void
}

export function PhoneChangeForm({ currentPhone, onPhoneChanged }: PhoneChangeFormProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [newPhone, setNewPhone] = useState("")
  const [obscuredPhone, setObscuredPhone] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const { toast } = useToast()

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Get phone from PhoneInput component
    const phoneInput = document.querySelector('input[name="phone"]') as HTMLInputElement
    const phone = phoneInput?.value

    if (!phone) {
      setError(t("errors.invalidPhone"))
      setIsLoading(false)
      return
    }

    try {
      const result = await requestPhoneChange(phone, language)

      if (result.success) {
        setNewPhone(phone)
        setObscuredPhone(result.obscuredIdentifier || "")
        setStep("otp")
      } else {
        if (result.message === "phoneExists") {
          setError(
            language === "he"
              ? "מספר הטלפון הזה כבר בשימוש"
              : language === "ru"
                ? "Этот номер телефона уже используется"
                : "This phone number is already in use",
          )
        } else {
          setError(t("errors.unknown"))
        }
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const code = otpCode.join("")
    if (code.length !== 6) {
      setError(t("errors.invalidOTP"))
      setIsLoading(false)
      return
    }

    try {
      const result = await confirmPhoneChange(newPhone, code)

      if (result.success) {
        setSuccess(
          language === "he"
            ? "מספר הטלפון שונה בהצלחה"
            : language === "ru"
              ? "Номер телефона успешно изменен"
              : "Phone number changed successfully",
        )
        setStep("phone")
        setNewPhone("")
        setOtpCode(["", "", "", "", "", ""])
        if (onPhoneChanged) {
          onPhoneChanged(newPhone)
        }
        toast({
          title: language === "he" ? "מספר הטלפון שונה בהצלחה" : language === "ru" ? "Номер телефона успешно изменен" : "Phone number changed successfully",
          variant: "default"
        })
      } else {
        setError(result.message)
        toast({
          title: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value
    if (value && !/^\d+$/.test(value)) return

    const newOtpCode = [...otpCode]
    newOtpCode[index] = value.slice(0, 1)
    setOtpCode(newOtpCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`phone-otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-turquoise-500" />
          <h3 className="text-lg font-medium mb-2">
            {language === "he"
              ? "אמת את הטלפון החדש"
              : language === "ru"
                ? "Подтвердите новый телефон"
                : "Verify New Phone"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "he"
              ? `שלחנו קוד אימות ל-${obscuredPhone}`
              : language === "ru"
                ? `Мы отправили код подтверждения на ${obscuredPhone}`
                : `We sent a verification code to ${obscuredPhone}`}
          </p>
        </div>

        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label className="text-center">
              {language === "he"
                ? "הכנס קוד אימות"
                : language === "ru"
                  ? "Введите код подтверждения"
                  : "Enter verification code"}
            </Label>
            <div className="flex justify-center gap-2">
              {otpCode.map((digit, index) => (
                <Input
                  key={index}
                  id={`phone-otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  className="w-10 h-12 text-center text-lg border-turquoise-200 focus-visible:ring-turquoise-500"
                />
              ))}
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("phone")} className="flex-1">
              {language === "he" ? "חזור" : language === "ru" ? "Назад" : "Back"}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-turquoise-500 hover:bg-turquoise-600"
              disabled={isLoading || otpCode.join("").length !== 6}
            >
              {isLoading
                ? t("common.loading")
                : language === "he"
                  ? "אמת ושנה"
                  : language === "ru"
                    ? "Подтвердить и изменить"
                    : "Verify & Change"}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <form onSubmit={handlePhoneSubmit} className="space-y-6">
      {/* Current Phone */}
      <div className="space-y-2">
        <Label>{language === "he" ? "טלפון נוכחי" : language === "ru" ? "Текущий телефон" : "Current Phone"}</Label>
        <Input
          value={currentPhone || (language === "he" ? "לא הוגדר" : language === "ru" ? "Не установлен" : "Not set")}
          disabled
          className="bg-gray-50 border-gray-200"
        />
      </div>

      {/* New Phone */}
      <div className="space-y-2">
        <Label htmlFor="newPhone">
          {language === "he" ? "טלפון חדש" : language === "ru" ? "Новый телефон" : "New Phone"}
        </Label>
        <FormControl>
          <PhoneInput
            fullNumberValue={newPhone}
            onPhoneChange={(value) => setNewPhone(value)}
            placeholder={t("account.phonePlaceholder")}
          />
        </FormControl>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>}

      <Button type="submit" className="w-full bg-turquoise-500 hover:bg-turquoise-600" disabled={isLoading}>
        {isLoading
          ? t("common.loading")
          : language === "he"
            ? "שלח קוד אימות"
            : language === "ru"
              ? "Отправить код подтверждения"
              : "Send Verification Code"}
      </Button>
    </form>
  )
}
