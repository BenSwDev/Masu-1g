"use client"

import { useState } from "react"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { sendPasswordResetEmail } from "@/actions/password-reset-actions"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { t, dir, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await sendPasswordResetEmail(email, language)

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-turquoise-200">
          <CardHeader className="text-center relative">
            <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
              <LanguageSelector />
            </div>
            <CardTitle className="text-2xl font-bold text-turquoise-700">
              {language === "he" ? "××™×ž×™×™×œ × ×©×œ×—" : language === "ru" ? "ÐŸÐ¸ÑÑŒÐ¼Ð¾ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¾" : "Email Sent"}
            </CardTitle>
            <CardDescription>
              {language === "he"
                ? "×× ×§×™×™× ×—×©×‘×•×Ÿ ×¢× ×›×ª×•×‘×ª ×”××™×ž×™×™×œ ×”×–×•, ×ª×§×‘×œ ×§×™×©×•×¨ ×œ××™×¤×•×¡ ×¡×™×¡×ž×”"
                : language === "ru"
                  ? "Ð•ÑÐ»Ð¸ ÑƒÑ‡ÐµÑ‚Ð½Ð°Ñ Ð·Ð°Ð¿Ð¸ÑÑŒ Ñ ÑÑ‚Ð¸Ð¼ Ð°Ð´Ñ€ÐµÑÐ¾Ð¼ ÑÐ»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½Ð¾Ð¹ Ð¿Ð¾Ñ‡Ñ‚Ñ‹ ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÐµÑ‚, Ð²Ñ‹ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚Ðµ ÑÑÑ‹Ð»ÐºÑƒ Ð´Ð»Ñ ÑÐ±Ñ€Ð¾ÑÐ° Ð¿Ð°Ñ€Ð¾Ð»Ñ"
                  : "If an account with this email exists, you will receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 text-turquoise-500" />
              <p className="text-sm text-muted-foreground mb-6">
                {language === "he"
                  ? "×‘×“×•×§ ××ª ×ª×™×‘×ª ×”×“×•××¨ ×©×œ×š ×•×œ×—×¥ ×¢×œ ×”×§×™×©×•×¨ ×œ××™×¤×•×¡ ×”×¡×™×¡×ž×”"
                  : language === "ru"
                    ? "ÐŸÑ€Ð¾Ð²ÐµÑ€ÑŒÑ‚Ðµ ÑÐ²Ð¾ÑŽ ÑÐ»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½ÑƒÑŽ Ð¿Ð¾Ñ‡Ñ‚Ñƒ Ð¸ Ð½Ð°Ð¶Ð¼Ð¸Ñ‚Ðµ Ð½Ð° ÑÑÑ‹Ð»ÐºÑƒ Ð´Ð»Ñ ÑÐ±Ñ€Ð¾ÑÐ° Ð¿Ð°Ñ€Ð¾Ð»Ñ"
                    : "Check your email and click the password reset link"}
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mx-2" />
                  {language === "he" ? "×—×–×¨×” ×œ×”×ª×—×‘×¨×•×ª" : language === "ru" ? "Ð’ÐµÑ€Ð½ÑƒÑ‚ÑŒÑÑ Ðº Ð²Ñ…Ð¾Ð´Ñƒ" : "Back to Login"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-turquoise-200">
        <CardHeader className="text-center relative">
          <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
            <LanguageSelector />
          </div>
          <CardTitle className="text-2xl font-bold text-turquoise-700">
            {language === "he" ? "×©×›×—×ª ×¡×™×¡×ž×”?" : language === "ru" ? "Ð—Ð°Ð±Ñ‹Ð»Ð¸ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ?" : "Forgot Password?"}
          </CardTitle>
          <CardDescription>
            {language === "he"
              ? "×”×›× ×¡ ××ª ×›×ª×•×‘×ª ×”××™×ž×™×™×œ ×©×œ×š ×•× ×©×œ×— ×œ×š ×§×™×©×•×¨ ×œ××™×¤×•×¡ ×”×¡×™×¡×ž×”"
              : language === "ru"
                ? "Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ ÑÐ²Ð¾Ð¹ Ð°Ð´Ñ€ÐµÑ ÑÐ»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½Ð¾Ð¹ Ð¿Ð¾Ñ‡Ñ‚Ñ‹, Ð¸ Ð¼Ñ‹ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð¸Ð¼ Ð²Ð°Ð¼ ÑÑÑ‹Ð»ÐºÑƒ Ð´Ð»Ñ ÑÐ±Ñ€Ð¾ÑÐ° Ð¿Ð°Ñ€Ð¾Ð»Ñ"
                : "Enter your email address and we'll send you a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === "he" ? "×›×ª×•×‘×ª ××™×ž×™×™×œ" : language === "ru" ? "ÐÐ´Ñ€ÐµÑ ÑÐ»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½Ð¾Ð¹ Ð¿Ð¾Ñ‡Ñ‚Ñ‹" : "Email Address"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  language === "he"
                    ? "×”×›× ×¡ ××ª ×”××™×ž×™×™×œ ×©×œ×š"
                    : language === "ru"
                      ? "Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ Ð²Ð°ÑˆÑƒ ÑÐ»ÐµÐºÑ‚Ñ€Ð¾Ð½Ð½ÑƒÑŽ Ð¿Ð¾Ñ‡Ñ‚Ñƒ"
                      : "Enter your email"
                }
                className="border-turquoise-200 focus-visible:ring-turquoise-500 text-center placeholder:text-center"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

            <Button type="submit" className="w-full bg-turquoise-500 hover:bg-turquoise-600" disabled={isLoading}>
              {isLoading
                ? t("common.loading")
                : language === "he"
                  ? "×©×œ×— ×§×™×©×•×¨ ×œ××™×¤×•×¡"
                  : language === "ru"
                    ? "ÐžÑ‚Ð¿Ñ€Ð°Ð²Ð¸Ñ‚ÑŒ ÑÑÑ‹Ð»ÐºÑƒ Ð´Ð»Ñ ÑÐ±Ñ€Ð¾ÑÐ°"
                    : "Send Reset Link"}
            </Button>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-turquoise-600 hover:text-turquoise-700 underline">
                <ArrowLeft className="h-4 w-4 inline mx-1" />
                {language === "he" ? "×—×–×¨×” ×œ×”×ª×—×‘×¨×•×ª" : language === "ru" ? "Ð’ÐµÑ€Ð½ÑƒÑ‚ÑŒÑÑ Ðº Ð²Ñ…Ð¾Ð´Ñƒ" : "Back to Login"}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
