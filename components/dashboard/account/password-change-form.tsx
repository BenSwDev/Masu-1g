"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/actions/account-actions"
import { Eye, EyeOff } from "lucide-react"

export function PasswordChangeForm() {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const currentPassword = formData.get("currentPassword") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword)

      if (result.success) {
        setSuccess(
          language === "he"
            ? "הסיסמה שונתה בהצלחה"
            : language === "ru"
              ? "Пароль успешно изменен"
              : "Password changed successfully"
        )
        // Reset form
        e.currentTarget.reset()
      } else {
        if (result.message === "passwordMismatch") {
          setError(
            language === "he"
              ? "הסיסמאות החדשות אינן תואמות"
              : language === "ru"
                ? "Новые пароли не совпадают"
                : "New passwords do not match"
          )
        } else if (result.message === "invalidCurrentPassword") {
          setError(
            language === "he"
              ? "הסיסמה הנוכחית שגויה"
              : language === "ru"
                ? "Текущий пароль неверен"
                : "Current password is incorrect"
          )
        } else if (result.message === "weakPassword") {
          setError(
            language === "he"
              ? "הסיסמה החדשה חלשה מדי"
              : language === "ru"
                ? "Новый пароль слишком слабый"
                : "New password is too weak"
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

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">
          {language === "he"
            ? "סיסמה נוכחית"
            : language === "ru"
              ? "Текущий пароль"
              : "Current Password"}
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            className="border-turquoise-200 focus-visible:ring-turquoise-500 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("current")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPasswords.current ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">
          {language === "he" ? "סיסמה חדשה" : language === "ru" ? "Новый пароль" : "New Password"}
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPasswords.new ? "text" : "password"}
            className="border-turquoise-200 focus-visible:ring-turquoise-500 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("new")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPasswords.new ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
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

      {/* Confirm New Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {language === "he"
            ? "אימות סיסמה חדשה"
            : language === "ru"
              ? "Подтвердите новый пароль"
              : "Confirm New Password"}
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            className="border-turquoise-200 focus-visible:ring-turquoise-500 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("confirm")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPasswords.confirm ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
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
            ? "שנה סיסמה"
            : language === "ru"
              ? "Изменить пароль"
              : "Change Password"}
      </Button>
    </form>
  )
}
