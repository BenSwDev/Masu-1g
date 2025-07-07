import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Calendar, User, MapPin, CreditCard, FileText, Bell } from "lucide-react"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export default async function ProfessionalDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  // Only redirect if activeRole is not professional
  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  const quickActions = [
    {
      title: "הזמנות המטפל",
      description: "צפה בהזמנות חדשות, מאושרות ומושלמות",
      icon: Calendar,
      href: "/dashboard/professional/bookings",
      variant: "default" as const
    },
    {
      title: "עריכת פרופיל",
      description: "עדכן פרטים אישיים וטיפולים",
      icon: User,
      href: "/dashboard/professional/profile",
      variant: "outline" as const
    },
    {
      title: "אזורי עבודה",
      description: "עדכן את אזורי העבודה שלך",
      icon: MapPin,
      href: "/dashboard/professional/location",
      variant: "outline" as const
    },
    {
      title: "פרטי חשבון בנק",
      description: "עדכן פרטי חשבון לקבלת תשלומים",
      icon: CreditCard,
      href: "/dashboard/professional/bank-account",
      variant: "outline" as const
    }
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">שלום {session.user.name}</h1>
        <p className="text-gray-600">
          ברוכים הבאים לדשבורד המטפל שלכם
        </p>
        <p className="text-sm text-gray-500 mt-2">כאן תוכלו לנהל את כל הפעילויות המקצועיות שלכם</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Card key={action.href} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-turquoise-100 rounded-lg">
                  <action.icon className="h-5 w-5 text-turquoise-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {action.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href={action.href}>
                <Button 
                  variant={action.variant} 
                  className="w-full"
                >
                  {action.title}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            עדכונים חשובים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">מערכת הזמנות חדשה</h4>
              <p className="text-blue-700 text-sm mt-1">
                כעת תוכלו לקבל הזמנות חדשות וליהל אותן ישירות מהדשבורד
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900">עדכון פרופיל</h4>
              <p className="text-green-700 text-sm mt-1">
                וודאו שכל הפרטים שלכם מעודכנים לקבלת הזמנות מתאימות
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
