"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { PhoneInput } from "@/components/common/phone-input"
import { useRouter } from "next/navigation"
import { registerUser } from "@/actions/auth-actions"
  import { Checkbox } from "@/components/common/ui/checkbox"
  import { useToast } from "@/components/common/ui/use-toast"

export function RegisterForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { t, dir } = useTranslation()
  const iconSpacing = dir === "rtl" ? "ml-2" : "mr-2"
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [passwordMatch, setPasswordMatch] = useState(true)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

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

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible)
  }

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"))
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData(e.currentTarget)

      // Add role information
      if (isProfessional) {
        formData.append("role", "professional")
      }

      const result = await registerUser(formData)

      if (!result.success) {
        if (result.message === "emailExists") {
          setError(t("errors.emailExists"))
          toast({ title: t("errors.emailExists"), variant: "destructive" })
        } else if (result.message === "phoneExists") {
          setError(t("errors.phoneExists"))
          toast({ title: t("errors.phoneExists"), variant: "destructive" })
        } else if (result.message === "weakPassword") {
          setError(t("errors.weakPassword"))
          toast({ title: t("errors.weakPassword"), variant: "destructive" })
        } else if (result.message === "invalidDateOfBirth") {
          setError(t("errors.invalidDateOfBirth"))
          toast({ title: t("errors.invalidDateOfBirth"), variant: "destructive" })
        } else if (result.message === "missingFields") {
          setError(t("errors.missingFields"))
          toast({ title: t("errors.missingFields"), variant: "destructive" })
        } else {
          setError(t("errors.registrationFailed"))
          toast({ title: t("errors.registrationFailed"), variant: "destructive" })
        }
      } else {
        setSuccess(true)
        toast({ title: t("success.registrationComplete"), variant: "default" })
      }
    } catch (error) {
      setError(t("errors.unknown"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className="border-turquoise-200">
        <CardHeader className="text-center relative pb-4">
          <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
            <LanguageSelector />
          </div>
          <CardTitle className="text-xl font-bold text-turquoise-700">{t("register.welcome")}</CardTitle>
          <CardDescription className="text-sm">{t("register.createAccount")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Professional Registration Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isProfessional"
                checked={isProfessional}
                onCheckedChange={(checked) => setIsProfessional(checked === true)}
              />
              <label
                htmlFor="isProfessional"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("register.registerAsProfessional")}
              </label>
            </div>

            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-sm">{t("register.fullName")}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder={t("register.fullNamePlaceholder")}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500 h-9"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm">{t("register.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("register.emailPlaceholder")}
                  className="border-turquoise-200 focus-visible:ring-turquoise-500 h-9"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm">{t("register.phone")}</Label>
              <PhoneInput
                id="phone"
                name="phone"
                placeholder={t("register.phonePlaceholder")}
                className="border-turquoise-200 focus-visible:ring-turquoise-500 h-9"
              />
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm">{t("register.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={passwordVisible ? "text" : "password"}
                    className="border-turquoise-200 focus-visible:ring-turquoise-500 h-9 pr-10"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                    {passwordVisible ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-500"
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
                        className="h-4 w-4 text-gray-500"
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
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-sm">{t("register.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={confirmPasswordVisible ? "text" : "password"}
                    className={cn(
                      "border-turquoise-200 focus-visible:ring-turquoise-500 h-9 pr-10",
                      confirmPassword && !passwordMatch ? "border-red-500" : "",
                    )}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                    {confirmPasswordVisible ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-500"
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
                        className="h-4 w-4 text-gray-500"
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
                  <p className="text-xs text-red-500">{t("errors.passwordMismatch")}</p>
                )}
              </div>
            </div>

            {/* Password Requirements - Compact */}
            <p className="text-xs text-muted-foreground">{t("register.passwordRequirements")}</p>

            {/* Gender and Date of Birth Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gender */}
              <div className="space-y-2">
                <Label className="text-sm">{t("register.gender")}</Label>
                <RadioGroup name="gender" defaultValue="male" className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <RadioGroupItem value="male" id="male" className="peer sr-only" />
                    <Label
                      htmlFor="male"
                      className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500 text-xs"
                    >
                      <svg className={`h-4 w-4 ${iconSpacing}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {t("register.male")}
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="female" id="female" className="peer sr-only" />
                    <Label
                      htmlFor="female"
                      className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500 text-xs"
                    >
                      <svg className={`h-4 w-4 ${iconSpacing}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      {t("register.female")}
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="other" id="other" className="peer sr-only" />
                    <Label
                      htmlFor="other"
                      className="flex cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-turquoise-500 peer-data-[state=checked]:bg-turquoise-50 peer-data-[state=checked]:text-turquoise-700 [&:has([data-state=checked])]:border-turquoise-500 text-xs"
                    >
                      <svg className={`h-4 w-4 ${iconSpacing}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      {t("register.other")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label className="text-sm">{t("register.dateOfBirth")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <Select name="day">
                    <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500 h-9 text-sm">
                      <SelectValue placeholder={t("register.day")} />
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
                  <Select name="month">
                    <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500 h-9 text-sm">
                      <SelectValue placeholder={t("register.month")} />
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
                  <Select name="year">
                    <SelectTrigger className="border-turquoise-200 focus:ring-turquoise-500 h-9 text-sm">
                      <SelectValue placeholder={t("register.year")} />
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
            </div>

            {/* Error and Success Messages */}
            {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</div>}
            {success && (
              <div className="rounded-md bg-green-50 p-2 text-sm text-green-800">
                {t("success.registrationComplete")}
              </div>
            )}

            {/* Register Button */}
            <Button type="submit" className="w-full bg-turquoise-500 hover:bg-turquoise-600 h-9" disabled={isLoading}>
              {isLoading ? t("common.loading") : t("register.registerButton")}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm">
            {t("register.alreadyHaveAccount")}{" "}
            <a href="/auth/login" className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700">
              {t("register.signIn")}
            </a>
          </div>
        </CardContent>
      </Card>
      
      {/* Terms and Conditions - Compact */}
      <div className="text-balance text-center text-xs text-muted-foreground">
        {t("register.termsAgreement")}{" "}
        <a href="#" className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700">
          {t("register.termsOfService")}
        </a>{" "}
        {t("register.and")}{" "}
        <a href="#" className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700">
          {t("register.privacyPolicy")}
        </a>
        .
      </div>
    </div>
  )
}
