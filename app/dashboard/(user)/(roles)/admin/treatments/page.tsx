import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"
import { getTreatmentStats } from "./actions"
import { 
  Stethoscope, 
  CheckCircle, 
  XCircle, 
  Package, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar 
} from "lucide-react"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "ניהול טיפולים - מאסו",
  description: "ניהול טיפולים במערכת מאסו",
}

// Statistics Cards Component
async function TreatmentStatsCards() {
  const statsResult = await getTreatmentStats()
  
  if (!statsResult.success) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="border-destructive/50">
            <CardContent className="p-6">
              <div className="text-center text-destructive">
                שגיאה בטעינת הנתונים
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = statsResult.data

  const statsCards = [
    {
      title: "סה״כ טיפולים",
      value: stats.totalTreatments,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "כלל הטיפולים במערכת"
    },
    {
      title: "טיפולים פעילים",
      value: stats.activeTreatments,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "טיפולים זמינים להזמנה"
    },
    {
      title: "טיפולים לא פעילים",
      value: stats.inactiveTreatments,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "טיפולים שהושבתו"
    },
    {
      title: "מחיר ממוצע",
      value: `₪${stats.averagePrice}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "מחיר ממוצע לטיפול"
    },
    {
      title: "טווח מחירים",
      value: `₪${stats.priceRange.min}-${stats.priceRange.max}`,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "טווח מחירים קיים"
    },
    {
      title: "עיסויים",
      value: stats.categoryStats.massages,
      icon: Stethoscope,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "טיפולי עיסוי"
    },
    {
      title: "טיפולי פנים",
      value: stats.categoryStats.facial_treatments,
      icon: Stethoscope,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      description: "טיפולי פנים ויופי"
    },
    {
      title: "נוספו לאחרונה",
      value: stats.recentlyAdded,
      icon: Calendar,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      description: "30 הימים האחרונים"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsCards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Loading skeleton for stats
function TreatmentStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function TreatmentsPage() {
  try {
    const session = await requireUserSession()
    
    if (!session.user.roles?.includes("admin")) {
      redirect("/dashboard")
    }

    return (
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">ניהול טיפולים</h1>
          <p className="text-muted-foreground">
            נהל את כל הטיפולים במערכת - הוספה, עריכה, מחיקה והגדרת מחירים
          </p>
        </div>

        {/* Statistics Cards */}
        <Suspense fallback={<TreatmentStatsLoading />}>
          <TreatmentStatsCards />
        </Suspense>

        {/* Main Content */}
        <div className="space-y-6">
          <TreatmentsClient />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in TreatmentsPage:", error)
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">שגיאה בטעינת העמוד</h2>
              <p className="text-muted-foreground">
                אירעה שגיאה בטעינת עמוד הטיפולים. אנא נסה שוב מאוחר יותר.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
