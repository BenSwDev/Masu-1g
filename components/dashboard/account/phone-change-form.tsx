"use client"

import type React from "react"

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
              ? "×ž×¡×¤×¨ ×”×˜×œ×¤×•×Ÿ ×”×–×” ×›×‘×¨ ×‘×©×™×ž×•×©"
              : language === "ru"
                ? "Ð­Ñ‚Ð¾Ñ‚ Ð½Ð¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÑƒÐ¶Ðµ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÑ‚ÑÑ"
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
            ? "×ž×¡×¤×¨ ×”×˜×œ×¤×•×Ÿ ×©×•× ×” ×‘×”×¦×œ×—×”"
            : language === "ru"
              ? "ÐÐ¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½"
              : "Phone number changed successfully",
        )
        setStep("phone")
        setNewPhone("")
        setOtpCode(["", "", "", "", "", ""])
        if (onPhoneChanged) {
          onPhoneChanged(newPhone)
        }
        toast({
          title: language === "he" ? "×ž×¡×¤×¨ ×”×˜×œ×¤×•×Ÿ ×©×•× ×” ×‘×”×¦×œ×—×”" : language === "ru" ? "ÐÐ¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½" : "Phone number changed successfully",
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
              ? "××ž×ª ××ª ×”×˜×œ×¤×•×Ÿ ×”×—×“×©"
              : language === "ru"
                ? "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ðµ Ð½Ð¾Ð²Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½"
                : "Verify New Phone"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === "he"
              ? `×©×œ×—× ×• ×§×•×“ ××™×ž×•×ª ×œ-${obscuredPhone}`
              : language === "ru"
                ? `ÐœÑ‹ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð»Ð¸ ÐºÐ¾Ð´ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ Ð½Ð° ${obscuredPhone}`
                : `We sent a verification code to ${obscuredPhone}`}
          </p>
        </div>

        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label className="text-center">
              {language === "he"
                ? "×”×›× ×¡ ×§×•×“ ××™×ž×•×ª"
                : language === "ru"
                  ? "Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ ÐºÐ¾Ð´ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ"
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
              {language === "he" ? "×—×–×•×¨" : language === "ru" ? "ÐÐ°Ð·Ð°Ð´" : "Back"}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-turquoise-500 hover:bg-turquoise-600"
              disabled={isLoading || otpCode.join("").length !== 6}
            >
              {isLoading
                ? t("common.loading")
                : language === "he"
                  ? "××ž×ª ×•×©× ×”"
                  : language === "ru"
                    ? "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚ÑŒ Ð¸ Ð¸Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ"
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
        <Label>{language === "he" ? "×˜×œ×¤×•×Ÿ × ×•×›×—×™" : language === "ru" ? "Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½" : "Current Phone"}</Label>
        <Input
          value={currentPhone || (language === "he" ? "×œ× ×”×•×’×“×¨" : language === "ru" ? "ÐÐµ ÑƒÑÑ‚Ð°Ð½Ð¾Ð²Ð»ÐµÐ½" : "Not set")}
          disabled
          className="bg-gray-50 border-gray-200"
        />
      </div>

      {/* New Phone */}
      <div className="space-y-2">
        <Label htmlFor="newPhone">
          {language === "he" ? "×˜×œ×¤×•×Ÿ ×—×“×©" : language === "ru" ? "ÐÐ¾Ð²Ñ‹Ð¹ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½" : "New Phone"}
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
            ? "×©×œ×— ×§×•×“ ××™×ž×•×ª"
            : language === "ru"
              ? "ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ ÐºÐ¾Ð´ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ"
              : "Send Verification Code"}
      </Button>
    </form>
  )
}
