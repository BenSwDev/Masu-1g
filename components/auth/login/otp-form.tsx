"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { useTranslation } from "@/lib/translations/i18n"
import { MessageSquareCode, Loader2 } from "lucide-react"
import { generateAndSendOTP, verifyOTP } from "@/actions/notification-actions"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useToast } from "@/components/common/ui/use-toast"
import { useSession } from "next-auth/react"

interface OTPFormProps {
  className?: string
  loginType: "email" | "phone"
  identifier: string
  onIdentifierChange?: (value: string) => void
}

export function OTPForm({ className, loginType, identifier, onIdentifierChange }: OTPFormProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingOTP, setIsSendingOTP] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [obscuredIdentifier, setObscuredIdentifier] = useState("")
  const [error, setError] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [cooldown, setCooldown] = useState(0)
  const [currentIdentifier, setCurrentIdentifier] = useState(identifier)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const identifierInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()

  // Update current identifier when identifier prop changes
  useEffect(() => {
    if (identifier) {
      setCurrentIdentifier(identifier)
    }
  }, [identifier])

  // Handle countdown for resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [cooldown])

  // Auto-focus first OTP input when OTP is sent
  useEffect(() => {
    if (otpSent && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 100)
    }
  }, [otpSent])

  // Handle auto-fill from iOS SMS (when full code is entered in one field)
  const handleAutoFill = (value: string, currentIndex: number) => {
    // Extract only digits from the value
    const digits = value.replace(/\D/g, "")

    // If we have 6 digits (full OTP code), distribute them across all fields
    if (digits.length === 6) {
      const newOtpCode = digits.split("").slice(0, 6)
      setOtpCode(newOtpCode)

      // Focus the last field
      setTimeout(() => {
        otpInputRefs.current[5]?.focus()
      }, 10)

      return true // Indicate that auto-fill was handled
    }

    return false // Indicate that this is not auto-fill
  }

  // Handle OTP input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value

    // Check if this is iOS auto-fill (full code in one field)
    if (handleAutoFill(value, index)) {
      return
    }

    // Only allow digits for single character input
    if (value && !/^\d+$/.test(value)) return

    // Update the OTP code array
    const newOtpCode = [...otpCode]
    newOtpCode[index] = value.slice(0, 1)
    setOtpCode(newOtpCode)

    // Auto-focus next input field when a digit is entered
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  // Handle input event (for iOS auto-fill detection)
  const handleInput = (e: React.FormEvent<HTMLInputElement>, index: number) => {
    const target = e.target as HTMLInputElement
    const value = target.value

    // Check if this is iOS auto-fill (full code in one field)
    if (handleAutoFill(value, index)) {
      return
    }
  }

  // Handle key down events for backspace and arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpCode[index] && index > 0) {
        const newOtpCode = [...otpCode]
        newOtpCode[index - 1] = ""
        setOtpCode(newOtpCode)
        otpInputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  // Handle paste event - ONLY on the first input
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    // ONLY allow paste on the first input (index 0)
    if (index !== 0) {
      e.preventDefault()
      return
    }

    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").trim()

    // Extract only digits from pasted content
    const digits = pastedData.replace(/\D/g, "").split("").slice(0, 6)

    if (digits.length === 0) return

    // Create new OTP array filled with extracted digits
    const newOtpCode = ["", "", "", "", "", ""]
    digits.forEach((digit, digitIndex) => {
      if (digitIndex < 6) {
        newOtpCode[digitIndex] = digit
      }
    })

    setOtpCode(newOtpCode)

    // Focus the appropriate field
    const nextEmptyIndex = newOtpCode.findIndex((v) => !v)
    if (nextEmptyIndex !== -1) {
      // Focus next empty field
      setTimeout(() => {
        otpInputRefs.current[nextEmptyIndex]?.focus()
      }, 10)
    } else {
      // All fields filled, focus last field
      setTimeout(() => {
        otpInputRefs.current[5]?.focus()
      }, 100)
    }
  }

  // Prevent paste on all inputs except the first one
  const handlePastePrevent = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
  }

  // Get current identifier from input field (client-side only)
  const getCurrentIdentifier = () => {
    if (loginType === "email") {
      return identifierInputRef.current?.value || currentIdentifier
    } else {
      // For phone, try to get the value from the phone input ref
      return phoneInputRef.current?.value || currentIdentifier
    }
  }

  // Send OTP code
  const handleSendOTP = async () => {
    // Get the current identifier value
    const identifierValue = getCurrentIdentifier()

    // הסרת הוולידציה המיידית - בדיקה רק בעת לחיצה על הכפתור
    if (!identifierValue) {
      setError(loginType === "email" ? t("errors.invalidEmail") : t("errors.invalidPhone"))
      toast({
        title: t("errors.invalidInput"),
        description: loginType === "email" ? t("errors.invalidEmail") : t("errors.invalidPhone"),
        variant: "destructive",
      })
      return
    }

    setCurrentIdentifier(identifierValue)
    if (onIdentifierChange) {
      onIdentifierChange(identifierValue)
    }

    setIsSendingOTP(true)
    setError("")

    try {
      console.log(`Sending OTP to ${loginType}: ${identifierValue}`)

      toast({
        title: t("login.sendingOTP"),
        description: loginType === "email" ? t("login.sendingOTPToEmail") : t("login.sendingOTPToPhone"),
      })

      const result = await generateAndSendOTP(identifierValue, loginType, language)
      console.log("OTP send result:", result)

      if (result.success) {
        setOtpSent(true)
        setObscuredIdentifier(result.obscuredIdentifier || "")
        setCooldown(60) // 60 second cooldown

        toast({
          title: t("login.otpSent"),
          description: loginType === "email" ? t("login.otpSentToEmail") : t("login.otpSentToPhone"),
        })
      } else {
        setError(result.message)

        toast({
          title: t("errors.otpSendFailed"),
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending OTP:", error)
      setError(t("errors.unknown"))

      toast({
        title: t("errors.otpSendFailed"),
        description: t("errors.unknown"),
        variant: "destructive",
      })
    } finally {
      setIsSendingOTP(false)
    }
  }

  // Verify OTP code
  const handleVerifyOTP = async () => {
    const code = otpCode.join("")
    if (code.length !== 6) {
      setError(t("errors.invalidOTP"))
      return
    }

    // Get the current identifier value
    const identifierValue = getCurrentIdentifier()

    if (!identifierValue) {
      setError(loginType === "email" ? t("errors.invalidEmail") : t("errors.invalidPhone"))
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log(`Verifying OTP for ${loginType}: ${identifierValue}, code: ${code}`)

      toast({
        title: t("login.verifyingOTP"),
        description: t("login.pleaseWait"),
      })

      const result = await verifyOTP(identifierValue, loginType, code)
      console.log("OTP verification result:", result)

      if (result.success && result.userId) {
        // Sign in the user
        toast({
          title: t("login.otpVerified"),
          description: t("login.signingIn"),
        })

        const signInResult = await signIn("otp", {
          redirect: false,
          userId: result.userId,
        })

        if (signInResult?.error) {
          setError(t("errors.authFailed"))

          toast({
            title: t("errors.authFailed"),
            description: t("errors.unknown"),
            variant: "destructive",
          })
        } else if (signInResult?.ok) {
          toast({
            title: t("login.authenticationSuccessful"),
            description: t("login.redirecting"),
            variant: "default"
          })
          // הפניה אוטומטית לעמוד התפקיד
          setTimeout(() => {
            const role = session?.user?.activeRole || "member"
            router.push(`/dashboard/${role}`)
          }, 500)
        }
      } else {
        setError(result.message)

        toast({
          title: t("errors.otpVerificationFailed"),
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error verifying OTP:", error)
      setError(t("errors.unknown"))

      toast({
        title: t("errors.otpVerificationFailed"),
        description: t("errors.unknown"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)}>
      {!otpSent ? (
        <>
          <p className="text-sm text-muted-foreground text-center">
            {loginType === "email" ? t("login.otpEmailInstructions") : t("login.otpPhoneInstructions")}
          </p>
          <Button
            onClick={handleSendOTP}
            disabled={isSendingOTP}
            className="w-full bg-turquoise-500 hover:bg-turquoise-600 h-11"
          >
            {isSendingOTP ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <MessageSquareCode className="h-4 w-4 mr-2" />
                {t("login.sendOTP")}
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {loginType === "email" ? t("login.otpEmailSent") : t("login.otpPhoneSent")}
            </p>
            <p className="font-medium mt-1">{obscuredIdentifier}</p>
          </div>

          <div className="grid gap-2">
            <label className="text-center text-sm font-medium">{t("login.enterOTP")}</label>
            <div className="flex justify-center gap-2">
              {otpCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6} // Allow up to 6 characters for iOS auto-fill
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  onInput={(e) => handleInput(e, index)} // Handle iOS auto-fill
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={index === 0 ? (e) => handlePaste(e, index) : handlePastePrevent}
                  className="w-10 h-12 text-center text-lg border-turquoise-200 focus-visible:ring-turquoise-500"
                  autoComplete={index === 0 ? "one-time-code" : "off"} // Enable iOS auto-fill for first field
                />
              ))}
            </div>

            <div className="text-center mt-2">
              <Button
                variant="link"
                size="sm"
                onClick={handleSendOTP}
                disabled={cooldown > 0 || isSendingOTP}
                className="text-turquoise-600 hover:text-turquoise-700"
              >
                {isSendingOTP ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : cooldown > 0 ? (
                  `${t("login.resendIn")} ${cooldown}s`
                ) : (
                  t("login.resendOTP")
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleVerifyOTP}
            disabled={isLoading || otpCode.join("").length !== 6}
            className="w-full bg-turquoise-500 hover:bg-turquoise-600 h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("login.verifyAndSignIn")
            )}
          </Button>
        </>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </div>
  )
}
