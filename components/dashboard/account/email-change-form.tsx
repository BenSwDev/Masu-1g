"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestEmailChange, confirmEmailChange } from "@/actions/account-actions"
import { Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface EmailChangeFormProps {
  currentEmail: string
  onEmailChanged?: (newEmail: string) => void
}

export function EmailChangeForm({ currentEmail, onEmailChanged }: EmailChangeFormProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [newEmail, setNewEmail] = useState("")
  const [obscuredEmail, setObscuredEmail] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const { toast } = useToast()

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("newEmail") as string

    try {
      const result = await requestEmailChange(email, language)

      if (result.success) {
        setNewEmail(email)
        setObscuredEmail(result.obscuredIdentifier || "")
        setStep("otp")
      } else {
        if (result.message === "emailExists") {
          setError(
            language === "he"
              ? "כתובת האימייל הזו כבר בשימוש"
              : language === "ru"
                ? "Этот адрес электронной почты уже используется"
                : "This email address is already in use"
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
      const result = await confirmEmailChange(newEmail, code)

      if (result.success) {
        setSuccess(
          language === "he"
            ? "כתובת האימייל שונתה בהצלחה"
            : language === "ru"
              ? "Адрес электронной почты успешно изменен"
              : "Email address changed successfully"
        )
        setStep("email")
        setNewEmail("")
        setOtpCode(["", "", "", "", "", ""])
        if (onEmailChanged) {
          onEmailChanged(newEmail)
        }
        toast({
          title:
            language === "he"
              ? "כתובת האימייל שונתה בהצלחה"
              : language === "ru"
                ? "Адрес электронной почты успешно изменен"
                : "Email address changed successfully",
          variant: "default",
        })
      } else {
        setError(result.message)
        toast({
          title: result.message,
          variant: "destructive",
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
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-turquoise-500" />
          <h3 className="text-lg font-medium mb-2">
            {language === "he"
              ? "אמת את האימייל החדש"
              : language === "ru"
                ? "Подтвердите новый email"
                : "Verify New Email"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "he"
              ? `שלחנו קוד אימות ל-${obscuredEmail}`
              : language === "ru"
                ? `Мы отправили код подтверждения на ${obscuredEmail}`
                : `We sent a verification code to ${obscuredEmail}`}
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
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(e, index)}
                  className="w-10 h-12 text-center text-lg border-turquoise-200 focus-visible:ring-turquoise-500"
                />
              ))}
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("email")}
              className="flex-1"
            >
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
    <form onSubmit={handleEmailSubmit} className="space-y-6">
      {/* Current Email */}
      <div className="space-y-2">
        <Label>
          {language === "he"
            ? "אימייל נוכחי"
            : language === "ru"
              ? "Текущий email"
              : "Current Email"}
        </Label>
        <Input value={currentEmail} disabled className="bg-gray-50 border-gray-200" />
      </div>

      {/* New Email */}
      <div className="space-y-2">
        <Label htmlFor="newEmail">
          {language === "he" ? "אימייל חדש" : language === "ru" ? "Новый email" : "New Email"}
        </Label>
        <Input
          id="newEmail"
          name="newEmail"
          type="email"
          placeholder={
            language === "he"
              ? "הכנס אימייל חדש"
              : language === "ru"
                ? "Введите новый email"
                : "Enter new email"
          }
          className="border-turquoise-200 focus-visible:ring-turquoise-500"
          required
        />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      <Button
        type="submit"
        className="w-full bg-turquoise-500 hover:bg-turquoise-600"
        disabled={isLoading}
      >
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
