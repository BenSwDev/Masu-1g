"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { verifyResetToken, resetPasswordWithToken } from "@/actions/password-reset-actions"
import { CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface ResetPasswordFormProps {
  token: string
  className?: string
}

export function ResetPasswordForm({ token, className, ...props }: ResetPasswordFormProps) {
  const { t, dir, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [passwordMatch, setPasswordMatch] = useState(true)
  const router = useRouter()

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await verifyResetToken(token)
        if (result.success) {
          setTokenValid(true)
        } else {
          setError(result.message)
        }
      } catch (error) {
        setError("Failed to verify reset token")
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (confirmPassword) {
      setPasswordMatch(e.target.value === confirmPassword)
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    setPasswordMatch(password === e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError(
        language === "he"
          ? "הסיסמאות אינן תואמות"
          : language === "ru"
            ? "Пароли не совпадают"
            : "Passwords do not match"
      )
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const result = await resetPasswordWithToken(token, password)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-turquoise-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-turquoise-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">
                {language === "he"
                  ? "מאמת קישור איפוס..."
                  : language === "ru"
                    ? "Проверка ссылки для сброса..."
                    : "Verifying reset link..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-2xl font-bold text-red-700">
              {language === "he"
                ? "קישור לא תקין"
                : language === "ru"
                  ? "Недействительная ссылка"
                  : "Invalid Link"}
            </CardTitle>
            <CardDescription className="text-red-600">
              {language === "he"
                ? "קישור איפוס הסיסמה לא תקין או פג תוקף"
                : language === "ru"
                  ? "Ссылка для сброса пароля недействительна или истекла"
                  : "The password reset link is invalid or has expired"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="inline-block px-6 py-2 bg-turquoise-500 text-white rounded-md hover:bg-turquoise-600 transition-colors"
              >
                {language === "he"
                  ? "בקש קישור חדש"
                  : language === "ru"
                    ? "Запросить новую ссылку"
                    : "Request New Link"}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border-green-200">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <CardTitle className="text-2xl font-bold text-green-700">
              {language === "he"
                ? "הסיסמה אופסה!"
                : language === "ru"
                  ? "Пароль сброшен!"
                  : "Password Reset!"}
            </CardTitle>
            <CardDescription className="text-green-600">
              {language === "he"
                ? "הסיסמה שלך אופסה בהצלחה. מעביר אותך לדף ההתחברות..."
                : language === "ru"
                  ? "Ваш пароль был успешно сброшен. Перенаправление на страницу входа..."
                  : "Your password has been reset successfully. Redirecting to login..."}
            </CardDescription>
          </CardHeader>
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
            {language === "he"
              ? "איפוס סיסמה"
              : language === "ru"
                ? "Сброс пароля"
                : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {language === "he"
              ? "הכנס סיסמה חדשה לחשבון שלך"
              : language === "ru"
                ? "Введите новый пароль для вашей учетной записи"
                : "Enter a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === "he"
                  ? "סיסמה חדשה"
                  : language === "ru"
                    ? "Новый пароль"
                    : "New Password"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {passwordVisible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "he"
                  ? "חייב להיות לפחות 8 תווים עם לפחות 3 מתוך 4: אותיות גדולות, קטנות, מספרים או תווים מיוחדים"
                  : language === "ru"
                    ? "Должно быть не менее 8 символов с минимум 3 из 4: заглавные, строчные буквы, цифры или спецсимволы"
                    : "Must be at least 8 characters with at least 3 of 4: uppercase, lowercase, numbers or special characters"}
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === "he"
                  ? "אימות סיסמה"
                  : language === "ru"
                    ? "Подтвердите пароль"
                    : "Confirm Password"}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={confirmPasswordVisible ? "text" : "password"}
                  className={cn(
                    "border-turquoise-200 focus-visible:ring-turquoise-500",
                    confirmPassword && !passwordMatch ? "border-red-500" : ""
                  )}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {confirmPasswordVisible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword && !passwordMatch && (
                <p className="text-xs text-red-500">
                  {language === "he"
                    ? "הסיסמאות אינן תואמות"
                    : language === "ru"
                      ? "Пароли не совпадают"
                      : "Passwords do not match"}
                </p>
              )}
            </div>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

            <Button
              type="submit"
              className="w-full bg-turquoise-500 hover:bg-turquoise-600"
              disabled={isLoading || !passwordMatch}
            >
              {isLoading
                ? t("common.loading")
                : language === "he"
                  ? "איפוס סיסמה"
                  : language === "ru"
                    ? "Сбросить пароль"
                    : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
