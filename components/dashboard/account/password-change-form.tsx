"use client"

import type React from "react"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
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
            ? "×”×¡×™×¡×ž×” ×©×•× ×ª×” ×‘×”×¦×œ×—×”"
            : language === "ru"
              ? "ÐŸÐ°Ñ€Ð¾Ð»ÑŒ ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð¸Ð·Ð¼ÐµÐ½ÐµÐ½"
              : "Password changed successfully",
        )
        // Reset form
        e.currentTarget.reset()
      } else {
        if (result.message === "passwordMismatch") {
          setError(
            language === "he"
              ? "×”×¡×™×¡×ž××•×ª ×”×—×“×©×•×ª ××™× ×Ÿ ×ª×•××ž×•×ª"
              : language === "ru"
                ? "ÐÐ¾Ð²Ñ‹Ðµ Ð¿Ð°Ñ€Ð¾Ð»Ð¸ Ð½Ðµ ÑÐ¾Ð²Ð¿Ð°Ð´Ð°ÑŽÑ‚"
                : "New passwords do not match",
          )
        } else if (result.message === "invalidCurrentPassword") {
          setError(
            language === "he"
              ? "×”×¡×™×¡×ž×” ×”× ×•×›×—×™×ª ×©×’×•×™×”"
              : language === "ru"
                ? "Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ Ð½ÐµÐ²ÐµÑ€ÐµÐ½"
                : "Current password is incorrect",
          )
        } else if (result.message === "weakPassword") {
          setError(
            language === "he"
              ? "×”×¡×™×¡×ž×” ×”×—×“×©×” ×—×œ×©×” ×ž×“×™"
              : language === "ru"
                ? "ÐÐ¾Ð²Ñ‹Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ ÑÐ»Ð¸ÑˆÐºÐ¾Ð¼ ÑÐ»Ð°Ð±Ñ‹Ð¹"
                : "New password is too weak",
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
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">
          {language === "he" ? "×¡×™×¡×ž×” × ×•×›×—×™×ª" : language === "ru" ? "Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ" : "Current Password"}
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
          {language === "he" ? "×¡×™×¡×ž×” ×—×“×©×”" : language === "ru" ? "ÐÐ¾Ð²Ñ‹Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ" : "New Password"}
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
            ? "×—×™×™×‘ ×œ×”×™×•×ª ×œ×¤×—×•×ª 8 ×ª×•×•×™× ×¢× ×œ×¤×—×•×ª 3 ×ž×ª×•×š 4: ××•×ª×™×•×ª ×’×“×•×œ×•×ª, ×§×˜× ×•×ª, ×ž×¡×¤×¨×™× ××• ×ª×•×•×™× ×ž×™×•×—×“×™×"
            : language === "ru"
              ? "Ð”Ð¾Ð»Ð¶Ð½Ð¾ Ð±Ñ‹Ñ‚ÑŒ Ð½Ðµ Ð¼ÐµÐ½ÐµÐµ 8 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð² Ñ Ð¼Ð¸Ð½Ð¸Ð¼ÑƒÐ¼ 3 Ð¸Ð· 4: Ð·Ð°Ð³Ð»Ð°Ð²Ð½Ñ‹Ðµ, ÑÑ‚Ñ€Ð¾Ñ‡Ð½Ñ‹Ðµ Ð±ÑƒÐºÐ²Ñ‹, Ñ†Ð¸Ñ„Ñ€Ñ‹ Ð¸Ð»Ð¸ ÑÐ¿ÐµÑ†ÑÐ¸Ð¼Ð²Ð¾Ð»Ñ‹"
              : "Must be at least 8 characters with at least 3 of 4: uppercase, lowercase, numbers or special characters"}
        </p>
      </div>

      {/* Confirm New Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {language === "he"
            ? "××™×ž×•×ª ×¡×™×¡×ž×” ×—×“×©×”"
            : language === "ru"
              ? "ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ðµ Ð½Ð¾Ð²Ñ‹Ð¹ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ"
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
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>}

      <Button type="submit" className="w-full bg-turquoise-500 hover:bg-turquoise-600" disabled={isLoading}>
        {isLoading
          ? t("common.loading")
          : language === "he"
            ? "×©× ×” ×¡×™×¡×ž×”"
            : language === "ru"
              ? "Ð˜Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ"
              : "Change Password"}
      </Button>
    </form>
  )
}
