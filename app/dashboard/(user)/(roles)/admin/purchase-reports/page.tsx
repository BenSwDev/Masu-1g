import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "דוחות רכישות",
  description: "צפייה בדוחות רכישות ונתונים סטטיסטיים"
}

export default async function PurchaseReportsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">דוחות רכישות</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ מכירות</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪125,430</div>
            <p className="text-xs text-muted-foreground">+20.1% מהחודש שעבר</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הזמנות</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1,234</div>
            <p className="text-xs text-muted-foreground">+5.1% מהחודש שעבר</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים פעילים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+15.2% מהחודש שעבר</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ערך הזמנה ממוצע</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪101.20</div>
            <p className="text-xs text-muted-foreground">+2.5% מהחודש שעבר</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>הזמנות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="mx-auto h-16 w-16 mb-4 opacity-50" />
            <p>בקרוב: דוחות מפורטים ונתונים סטטיסטיים נוספים</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 