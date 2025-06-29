"use client"

import type React from "react"
import { useState, type ReactNode, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Phone, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { PhoneInput } from "@/components/common/phone-input"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { OTPForm } from "./otp-form"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"

interface LoginMethodProps {
  children: ReactNode
  className?: string
}

function LoginMethod({ children, className }: LoginMethodProps) {
  return <div className={cn("grid gap-6", className)}>{children}</div>
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { t, dir } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [phoneIdentifier, setPhoneIdentifier] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()

  // Handle password form submission
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string

    if (!identifier || !password) {
      setError(t("errors.missingFields"))
      setIsLoading(false)
      return
    }

    try {
      // Show loading toast
      toast({
        title: t("login.authenticating"),
        description: t("login.pleaseWait"),
        duration: 3000,
      })

      const result = await signIn("credentials", {
        redirect: false,
        phone: identifier,
        password,
      })

      if (result?.error) {
        if (result.error === "No user found") {
          setError(t("errors.noUserFound"))
        } else if (result.error === "Invalid password") {
          setError(t("errors.invalidPassword"))
        } else {
          setError(t("errors.unknown"))
        }

        // Show error toast
        toast({
          title: t("login.authenticationFailed"),
          description:
            result.error === "No user found"
              ? t("errors.noUserFound")
              : result.error === "Invalid password"
                ? t("errors.invalidPassword")
                : t("errors.unknown"),
          variant: "destructive",
          duration: 5000,
        })
      } else if (result?.ok) {
        // Success
        toast({
          title: t("login.loginSuccessful"),
          description: t("login.redirecting"),
          duration: 2000,
        })

        // Small delay to show the success message
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(t("errors.unknown"))
      toast({
        title: t("login.authenticationFailed"),
        description: t("errors.unknown"),
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhoneIdentifier(value)
  }

  const handleOtpIdentifierChange = (value: string) => {
    setPhoneIdentifier(value)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-turquoise-200">
        <CardHeader className="text-center relative">
          <div className={`absolute top-0 ${dir === "rtl" ? "left-0" : "right-0"} p-2`}>
            <LanguageSelector />
          </div>
          <CardTitle className="text-2xl font-bold text-turquoise-700">{t("login.welcome")}</CardTitle>
          <CardDescription>{t("login.signIn")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password">{t("login.password")}</TabsTrigger>
              <TabsTrigger value="otp">{t("login.otp")}</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">
                      {t("login.phoneLabel")}
                    </Label>
                    <PhoneInput
                      name="identifier"
                      fullNumberValue={phoneIdentifier}
                      onPhoneChange={handlePhoneChange}
                      placeholder={t("login.phonePlaceholder")}
                      className="border-turquoise-200 focus-visible:ring-turquoise-500"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className={`flex items-center justify-between ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <Label htmlFor="password" className={dir === "rtl" ? "text-right" : ""}>
                        {t("login.passwordLabel")}
                      </Label>
                      <a
                        href="/auth/forgot-password"
                        className="text-sm text-turquoise-600 underline-offset-4 hover:underline"
                      >
                        {t("login.forgotPassword")}
                      </a>
                    </div>
                    <Input
                      name="password"
                      type="password"
                      className="border-turquoise-200 focus-visible:ring-turquoise-500 text-center placeholder:text-center"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-turquoise-500 hover:bg-turquoise-600 h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("login.signInButton")
                    )}
                  </Button>
                  {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
                </div>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="otp-identifier">
                    {t("login.phoneLabel")}
                  </Label>
                  <PhoneInput
                    id="otp-identifier"
                    name="phone"
                    fullNumberValue={phoneIdentifier}
                    onPhoneChange={handlePhoneChange}
                    placeholder={t("login.phonePlaceholder")}
                    className="border-turquoise-200 focus-visible:ring-turquoise-500"
                    required
                  />
                </div>

                <OTPForm
                  loginType="phone"
                  identifier={phoneIdentifier}
                  onIdentifierChange={handleOtpIdentifierChange}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            {t("login.noAccount")}{" "}
            <a
              href="/auth/register"
              className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700"
            >
              {t("login.signUp")}
            </a>
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground">
        {t("login.termsAgreement")}{" "}
        <a href="#" className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700">
          {t("login.termsOfService")}
        </a>{" "}
        {t("login.and")}{" "}
        <a href="#" className="text-turquoise-600 underline underline-offset-4 hover:text-turquoise-700">
          {t("login.privacyPolicy")}
        </a>
        .
      </div>
    </div>
  )
}
