"use client"

import type React from "react"
import { useState, type ReactNode, useRef, useEffect } from "react"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Mail, Phone, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { LanguageSelector } from "@/components/common/language-selector"
import { PhoneInput } from "@/components/common/phone-input"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { OTPForm } from "./otp-form"
import { useToast } from "@/components/common/ui/use-toast"
import { useSession } from "next-auth/react"
interface LoginMethodProps {
  children: ReactNode
  className?: string
}

function LoginMethod({ children, className }: LoginMethodProps) {
  return <div className={cn("grid gap-6", className)}>{children}</div>
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [loginType, setLoginType] = useState<"email" | "phone">("email")
  const { t, dir } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailIdentifier, setEmailIdentifier] = useState("")
  const [phoneIdentifier, setPhoneIdentifier] = useState("")
  const emailInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()

  // Focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [])

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

    console.log("Attempting login with:", identifier)

    try {
      // Show loading toast
      toast({
        title: t("login.authenticating"),
        description: t("login.pleaseWait"),
        duration: 3000,
      })

      const result = await signIn("credentials", {
        redirect: false,
        email: identifier, // This will be either email or phone
        password,
      })

      console.log("SignIn result:", result)

      if (result?.error) {
        console.log("Login error:", result.error)
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
        console.log("Login successful, redirecting...")

        // Show success toast
        toast({
          title: t("login.authenticationSuccessful"),
          description: t("login.redirecting"),
          duration: 1000,
          variant: "default"
        })

        // הפניה אוטומטית לעמוד התפקיד
        setTimeout(() => {
          const role = session?.user?.activeRole || "member"
          router.push(`/dashboard/${role}`)
        }, 500)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(t("errors.unknown"))

      // Show error toast
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

  // Handle email identifier change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailIdentifier(e.target.value)
  }

  // Handle phone identifier change (will be called from PhoneInput)
  const handlePhoneChange = (value: string) => {
    setPhoneIdentifier(value)
  }

  // Handle OTP identifier change
  const handleOtpIdentifierChange = (value: string) => {
    if (loginType === "email") {
      setEmailIdentifier(value)
    } else {
      setPhoneIdentifier(value)
    }
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
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={loginType === "email" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        loginType === "email"
                          ? "bg-turquoise-500 hover:bg-turquoise-600"
                          : "hover:bg-turquoise-50 hover:text-turquoise-700",
                      )}
                      onClick={() => setLoginType("email")}
                    >
                      <Mail className="h-4 w-4 mx-2" />
                      {t("login.email")}
                    </Button>
                    <Button
                      type="button"
                      variant={loginType === "phone" ? "default" : "outline"}
                      className={cn(
                        "flex-1",
                        loginType === "phone"
                          ? "bg-turquoise-500 hover:bg-turquoise-600"
                          : "hover:bg-turquoise-50 hover:text-turquoise-700",
                      )}
                      onClick={() => setLoginType("phone")}
                    >
                      <Phone className="h-4 w-4 mx-2" />
                      {t("login.phone")}
                    </Button>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="identifier">
                        {loginType === "phone" ? t("login.phoneLabel") : t("login.emailLabel")}
                      </Label>
                      {loginType === "phone" ? (
                        <PhoneInput
                          name="identifier"
                          fullNumberValue={phoneIdentifier}
                          onPhoneChange={handlePhoneChange}
                          placeholder={t("login.phonePlaceholder")}
                          className="border-turquoise-200 focus-visible:ring-turquoise-500"
                          required
                        />
                      ) : (
                        <Input
                          name="identifier"
                          type="email"
                          placeholder={t("login.emailPlaceholder")}
                          className="border-turquoise-200 focus-visible:ring-turquoise-500 text-center placeholder:text-center"
                          required
                          value={emailIdentifier}
                          onChange={handleEmailChange}
                          ref={emailInputRef}
                        />
                      )}
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
                </div>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              <div className="grid gap-6">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={loginType === "email" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      loginType === "email"
                        ? "bg-turquoise-500 hover:bg-turquoise-600"
                        : "hover:bg-turquoise-50 hover:text-turquoise-700",
                    )}
                    onClick={() => setLoginType("email")}
                  >
                    <Mail className="h-4 w-4 mx-2" />
                    {t("login.email")}
                  </Button>
                  <Button
                    type="button"
                    variant={loginType === "phone" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      loginType === "phone"
                        ? "bg-turquoise-500 hover:bg-turquoise-600"
                        : "hover:bg-turquoise-50 hover:text-turquoise-700",
                    )}
                    onClick={() => setLoginType("phone")}
                  >
                    <Phone className="h-4 w-4 mx-2" />
                    {t("login.phone")}
                  </Button>
                </div>

                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="otp-identifier">
                      {loginType === "phone" ? t("login.phoneLabel") : t("login.emailLabel")}
                    </Label>
                    {loginType === "phone" ? (
                      <PhoneInput
                        id="otp-identifier"
                        name="phone"
                        fullNumberValue={phoneIdentifier}
                        onPhoneChange={handlePhoneChange}
                        placeholder={t("login.phonePlaceholder")}
                        className="border-turquoise-200 focus-visible:ring-turquoise-500"
                        required
                      />
                    ) : (
                      <Input
                        id="otp-identifier"
                        type="email"
                        placeholder={t("login.emailPlaceholder")}
                        className="border-turquoise-200 focus-visible:ring-turquoise-500 text-center placeholder:text-center"
                        required
                        value={emailIdentifier}
                        onChange={handleEmailChange}
                      />
                    )}
                  </div>

                  <OTPForm
                    loginType={loginType}
                    identifier={loginType === "email" ? emailIdentifier : phoneIdentifier}
                    onIdentifierChange={handleOtpIdentifierChange}
                  />
                </div>
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
