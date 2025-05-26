"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { updateProfile } from "@/actions/profile-actions"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"

interface User {
  id: string
  name: string
  email: string
  phone?: string
  gender?: string
  dateOfBirth?: string
  image?: string
  createdAt: string
}

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { t, language } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Parse date of birth
  const dateOfBirth = user.dateOfBirth ? new Date(user.dateOfBirth) : null
  const initialDay = dateOfBirth?.getDate().toString() || ""
  const initialMonth = dateOfBirth ? (dateOfBirth.getMonth() + 1).toString() : ""
  const initialYear = dateOfBirth?.getFullYear().toString() || ""

  // Generate years for date of birth (from current year - 100 to current year - 13)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 - 13 + 1 }, (_, i) => currentYear - 13 - i)

  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  // Months for select dropdown
  const months = [
    { value: "1", label: t("register.january") },
    { value: "2", label: t("register.february") },
    { value: "3", label: t("register.march") },
    { value: "4", label: t("register.april") },
    { value: "5", label: t("register.may") },
    { value: "6", label: t("register.june") },
    { value: "7", label: t("register.july") },
    { value: "8", label: t("register.august") },
    { value: "9", label: t("register.september") },
    { value: "10", label: t("register.october") },
    { value: "11", label: t("register.november") },
    { value: "12", label: t("register.december") },
  ]

  // Generate avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData(e.currentTarget)
      const result = await updateProfile(formData)

      if (result.success) {
        setSuccess(
          language === "he"
            ? "הפרופיל עודכן בהצלחה"
            : language === "ru"
              ? "Профиль успешно обновлен"
              : "Profile updated successfully",
        )
        router.refresh()
      } else {
        setError(
          language === "he"
            ? "שגיאה בעדכון הפרופיל"
            : language === "ru"
              ? "Ошибка обновления профиля"
              : "Error updating profile",
        )
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-turquoise-200">
      <CardHeader>
        <CardTitle className="text-turquoise-700">
          {language === "he" ? "פרטים אישיים" : language === "ru" ? "Личная информация" : "Personal Information"}
        </CardTitle>
        <CardDescription>
          {language === "he"
            ? "עדכן את הפרטים האישיים שלך"
            : language === "ru"
              ? "Обновите вашу личную информацию"
              : "Update your personal information"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-turquoise-100 text-turquoise-700 text-lg font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{user.name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {language === "he" ? "שם מלא" : language === "ru" ? "Полное имя" : "Full Name"}
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              placeholder={
                language === "he"
                  ? "הכנס את שמך המלא"
                  : language === "ru"
                    ? "Введите ваше полное имя"
                    : "Enter your full name"
              }
              className="border-turquoise-200 focus-visible:ring-turquoise-500"
              required
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>{language === "he" ? "מגדר" : language === "ru" ? "Пол" : "Gender"}</Label>
            <RadioGroup name="gender" defaultValue={user.gender || "male"} className="grid grid-cols-3 gap-3">
              <div className="relative">
                <RadioGroupItem value="male" id="male" className="peer sr-only" />
                <Label
                  htmlFor="male"
                  className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500"
                >
                  {language === "he" ? "זכר" : language === "ru" ? "Мужской" : "Male"}
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="female" id="female" className="peer sr-only" />
                <Label
                  htmlFor="female"
                  className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500"
                >
                  {language === "he" ? "נקבה" : language === "ru" ? "Женский" : "Female"}
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="other" id="other" className="peer sr-only" />
                <Label
                  htmlFor="other"
                  className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500"
                >
                  {language === "he" ? "אחר" : language === "ru" ? "Другой" : "Other"}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label>{language === "he" ? "תאריך לידה" : language === "ru" ? "Дата рождения" : "Date of Birth"}</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Day */}
              <Select name="day" defaultValue={initialDay}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={language === "he" ? "יום" : language === "ru" ? "День" : "Day"} />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month */}
              <Select name="month" defaultValue={initialMonth}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={language === "he" ? "חודש" : language === "ru" ? "Месяц" : "Month"} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year */}
              <Select name="year" defaultValue={initialYear}>
                <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500">
                  <SelectValue placeholder={language === "he" ? "שנה" : language === "ru" ? "Год" : "Year"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>}

          {/* Save Button */}
          <Button type="submit" className="w-full bg-turquoise-500 hover:bg-turquoise-600" disabled={isLoading}>
            {isLoading
              ? t("common.loading")
              : language === "he"
                ? "שמור שינויים"
                : language === "ru"
                  ? "Сохранить изменения"
                  : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
