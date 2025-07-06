"use client"

import { useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"
import { formatNumberSafe } from "../utils/professional-utils"
import { Badge } from "@/components/common/ui/badge"
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import type { ProfessionalStats } from "@/lib/types/professional"

interface ProfessionalStatsProps {
  stats: ProfessionalStats
  loading?: boolean
  className?: string
}

export function ProfessionalStats({ 
  stats, 
  loading = false, 
  className = "" 
}: ProfessionalStatsProps) {
  const { t, dir } = useTranslation()

  const computedStats = useMemo(() => {
    const total = stats.total || 0
    const active = stats.active || 0
    const pending = (stats.byStatus?.pending_admin_approval || 0) + (stats.byStatus?.pending_user_action || 0)
    const rejected = stats.byStatus?.rejected || 0
    const suspended = stats.byStatus?.suspended || 0

    return {
      total,
      active,
      pending,
      rejected,
      suspended,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0
    }
  }, [stats])

  const statsConfig = [
    {
      title: "סה\"כ מטפלים",
      value: computedStats.total,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "מטפלים פעילים",
      value: computedStats.active,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      badge: `${computedStats.activePercentage}%`
    },
    {
      title: "ממתינים לאישור",
      value: computedStats.pending,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      badge: `${computedStats.pendingPercentage}%`
    },
    {
      title: "נדחו/מושהים",
      value: computedStats.rejected + computedStats.suspended,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    }
  ]

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`} dir={dir}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`stats-skeleton-${index}`} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`} dir={dir}>
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon
        
        return (
          <Card 
            key={`stat-${stat.title.replace(/\s+/g, '-')}`} 
            className={`border-0 shadow-sm hover:shadow-md transition-shadow duration-200 ${stat.bgColor} ${stat.borderColor} border`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>{stat.title}</span>
                {stat.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {stat.badge}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${stat.bgColor} border ${stat.borderColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {formatNumberSafe(stat.value)}
                  </div>
                  {stat.badge && (
                    <div className="text-xs text-muted-foreground mt-1">
                      מתוך {computedStats.total} מטפלים
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Detailed stats breakdown component
 */
interface DetailedStatsProps {
  stats: ProfessionalStats
  loading?: boolean
}

export function DetailedProfessionalStats({ 
  stats, 
  loading = false 
}: DetailedStatsProps) {
  const { t, dir } = useTranslation()

  const statusBreakdown = useMemo(() => {
    const byStatus = stats.byStatus || {}
    
    return [
      {
        status: "active",
        label: "פעילים",
        count: byStatus.active || 0,
        color: "text-green-600",
        bgColor: "bg-green-100"
      },
      {
        status: "pending_admin_approval",
        label: "ממתינים לאישור מנהל",
        count: byStatus.pending_admin_approval || 0,
        color: "text-orange-600",
        bgColor: "bg-orange-100"
      },
      {
        status: "pending_user_action",
        label: "ממתינים לפעולת משתמש",
        count: byStatus.pending_user_action || 0,
        color: "text-blue-600",
        bgColor: "bg-blue-100"
      },
      {
        status: "rejected",
        label: "נדחו",
        count: byStatus.rejected || 0,
        color: "text-red-600",
        bgColor: "bg-red-100"
      },
      {
        status: "suspended",
        label: "מושהים",
        count: byStatus.suspended || 0,
        color: "text-gray-600",
        bgColor: "bg-gray-100"
      }
    ]
  }, [stats.byStatus])

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`detailed-skeleton-${index}`} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm" dir={dir}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          פירוט סטטוס מטפלים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statusBreakdown.map((item) => (
            <div key={item.status} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.bgColor} border-2 ${item.color.replace('text-', 'border-')}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${item.color}`}>{item.count}</span>
                {stats.total > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((item.count / stats.total) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 