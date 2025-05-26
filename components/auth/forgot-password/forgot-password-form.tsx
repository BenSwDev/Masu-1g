"use client"

import type React from "react"
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
              {language === "he" ? "אימייל נשלח" : language === "ru" ? "Письмо отправлено" : "Email Sent"}
            </CardTitle>
            <CardDescription>
              {language === "he"
                ? "אם קיים חשבון עם כתובת האימייל הזו, תקבל קישור לאיפוס סיסמה"
                : language === "ru"
                  ? "Если учетная запись с этим адресом электронной почты существует, вы получите ссылку для сброса пароля"
                  : "If an account with this email exists, you will receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 text-turquoise-500" />
              <p className="text-sm text-muted-foreground mb-6">
                {language === "he"
                  ? "בדוק את תיבת הדואר שלך ולחץ על הקישור לאיפוס הסיסמה"
                  : language === "ru"
                    ? "Проверьте свою электронную почту и нажмите на ссылку для сброса пароля"
                    : "Check your email and click the password reset link"}
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mx-2" />
                  {language === "he" ? "חזרה להתחברות" : language === "ru" ? "Вернуться к входу" : "Back to Login"}
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
            {language === "he" ? "שכחת סיסמה?" : language === "ru" ? "Забыли пароль?" : "Forgot Password?"}
          </CardTitle>
          <CardDescription>
            {language === "he"
              ? "הכנס את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה"
              : language === "ru"
                ? "Введите свой адрес электронной почты, и мы отправим вам ссылку для сброса пароля"
                : "Enter your email address and we'll send you a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === "he" ? "כתובת אימייל" : language === "ru" ? "Адрес электронной почты" : "Email Address"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  language === "he"
                    ? "הכנס את האימייל שלך"
                    : language === "ru"
                      ? "Введите вашу электронную почту"
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
                  ? "שלח קישור לאיפוס"
                  : language === "ru"
                    ? "Отправить ссылку для сброса"
                    : "Send Reset Link"}
            </Button>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-turquoise-600 hover:text-turquoise-700 underline">
                <ArrowLeft className="h-4 w-4 inline mx-1" />
                {language === "he" ? "חזרה להתחברות" : language === "ru" ? "Вернуться к входу" : "Back to Login"}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
