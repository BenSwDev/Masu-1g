"use client"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasswordChangeForm } from "./password-change-form"
import { EmailChangeForm } from "./email-change-form"
import { PhoneChangeForm } from "./phone-change-form"

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

interface AccountFormProps {
  user: User
}

export function AccountForm({ user }: AccountFormProps) {
  const { language } = useTranslation()

  return (
    <Card className="border-turquoise-200">
      <CardHeader>
        <CardTitle className="text-turquoise-700">
          {language === "he" ? "הגדרות חשבון" : language === "ru" ? "Настройки аккаунта" : "Account Settings"}
        </CardTitle>
        <CardDescription>
          {language === "he"
            ? "נהל את אבטחת החשבון ופרטי הקשר שלך"
            : language === "ru"
              ? "Управляйте безопасностью аккаунта и контактной информацией"
              : "Manage your account security and contact information"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="password">
              {language === "he" ? "סיסמה" : language === "ru" ? "Пароль" : "Password"}
            </TabsTrigger>
            <TabsTrigger value="email">
              {language === "he" ? "אימייל" : language === "ru" ? "Эл. почта" : "Email"}
            </TabsTrigger>
            <TabsTrigger value="phone">
              {language === "he" ? "טלפון" : language === "ru" ? "Телефон" : "Phone"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <PasswordChangeForm />
          </TabsContent>

          <TabsContent value="email">
            <EmailChangeForm currentEmail={user.email} />
          </TabsContent>

          <TabsContent value="phone">
            <PhoneChangeForm currentPhone={user.phone} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
