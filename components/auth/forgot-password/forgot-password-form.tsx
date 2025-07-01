"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { PhoneInput } from "@/components/common/phone-input"
import { sendPasswordResetOTP, resetPasswordWithOTP } from "@/actions/password-reset-actions"
import { ArrowLeft, Shield } from "lucide-react"
import Link from "next/link"

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { t, dir, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"phone" | "otp" | "password" | "success">("phone")
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [obscuredPhone, setObscuredPhone] = useState("")
  const [phone, setPhone] = useState("")

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await sendPasswordResetOTP(language)

      if (result.success) {
        setObscuredPhone(result.obscuredIdentifier || phone)
        setStep("otp")
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      setError("×× × ×”×›× ×¡ ×§×•×“ OTP ×‘×Ÿ 6 ×¡×¤×¨×•×ª")
      return
    }
    setStep("password")
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (newPassword !== confirmPassword) {
      setError("newPasswordAndConfirmPasswordDoNotMatch")
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPasswordWithOTP(otpCode, newPassword, language)

      if (result.success) {
        setStep("success")
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  // Success step
  if (step === "success") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-turquoise-200">
          <CardContent>
            <div className="text-center py-6">
              <Shield className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2">×”×¡×™×¡×ž×” ×©×•× ×ª×” ×‘×”×¦×œ×—×”!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                ×™×›×•×œ ×¢×›×©×™×• ×œ×”×ª×—×‘×¨ ×¢× ×”×¡×™×¡×ž×” ×”×—×“×©×”
              </p>
              <Link href="/auth/login">
                <Button className="w-full bg-turquoise-500 hover:bg-turquoise-600">
                  ×”×ª×—×‘×¨ ×¢×›×©×™×•
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password step
  if (step === "password") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-turquoise-200">
          <CardHeader className="text-center relative">
            <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
              <LanguageSelector />
            </div>
            <CardTitle className="text-2xl font-bold text-turquoise-700">×”×›× ×¡ ×¡×™×¡×ž×” ×—×“×©×”</CardTitle>
            <CardDescription>×”×›× ×¡ ××ª ×”×¡×™×¡×ž×” ×”×—×“×©×” ×©×œ×š</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">×¡×™×¡×ž×” ×—×“×©×”</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="×”×›× ×¡ ×¡×™×¡×ž×” ×—×“×©×”"
                  required
                  minLength={8}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">××™×ž×•×ª ×¡×™×¡×ž×”</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="×”×›× ×¡ ××ª ×”×¡×™×¡×ž×” ×©×•×‘"
                  required
                  minLength={8}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500"
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
              )}
              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-turquoise-500 hover:bg-turquoise-600"
              >
                {isLoading ? "×ž×¢×“×›×Ÿ..." : "×©× ×” ×¡×™×¡×ž×”"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // OTP step
  if (step === "otp") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-turquoise-200">
          <CardHeader className="text-center relative">
            <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
              <LanguageSelector />
            </div>
            <CardTitle className="text-2xl font-bold text-turquoise-700">×”×›× ×¡ ×§×•×“ ××™×ž×•×ª</CardTitle>
            <CardDescription>×©×œ×—× ×• ×§×•×“ ××™×ž×•×ª ×œ-{obscuredPhone}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otpCode">×§×•×“ ××™×ž×•×ª (6 ×¡×¤×¨×•×ª)</Label>
                <Input
                  id="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500 text-center text-lg tracking-widest"
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
              )}
              <Button
                type="submit"
                disabled={otpCode.length !== 6}
                className="w-full bg-turquoise-500 hover:bg-turquoise-600"
              >
                ×”×ž×©×š
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("phone")}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mx-2" />
                ×—×–×¨×”
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Phone step (default)
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-turquoise-200">
        <CardHeader className="text-center relative">
          <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
            <LanguageSelector />
          </div>
          <CardTitle className="text-2xl font-bold text-turquoise-700">×©×›×—×ª ×¡×™×¡×ž×”?</CardTitle>
          <CardDescription>×”×›× ×¡ ××ª ×ž×¡×¤×¨ ×”×˜×œ×¤×•×Ÿ ×©×œ×š ×•× ×©×œ×— ×œ×š ×§×•×“ ××™×ž×•×ª</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">×ž×¡×¤×¨ ×˜×œ×¤×•×Ÿ</Label>
              <PhoneInput
                fullNumberValue={phone}
                onPhoneChange={setPhone}
                placeholder={t("common.phoneNumber")}
                className="border-turquoise-200 focus-visible:ring-turquoise-500"
                required
              />
            </div>
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            <Button
              type="submit"
              disabled={isLoading || !phone}
              className="w-full bg-turquoise-500 hover:bg-turquoise-600"
            >
              {isLoading ? "×©×•×œ×—..." : "×©×œ×— ×§×•×“ ××™×ž×•×ª"}
            </Button>
            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-turquoise-600 underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mx-2 inline" />
                ×—×–×¨×” ×œ×”×ª×—×‘×¨×•×ª
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

