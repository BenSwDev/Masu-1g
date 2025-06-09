"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import type { PurchaseStats } from "@/lib/types/purchase-summary"
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  CreditCard,
  Gift,
  Stethoscope,
  DollarSign,
} from "lucide-react"

interface PurchaseStatsOverviewProps {
  stats: PurchaseStats
  isLoading?: boolean
}

export default function PurchaseStatsOverview({
  stats,
  isLoading = false,
}: PurchaseStatsOverviewProps) {
  const { t } = useTranslation()

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('he-IL')} ש״ח`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: t('purchaseStats.totalRevenue') || 'סה״כ הכנסות',
      value: formatCurrency(stats.totalRevenue),
      description: t('purchaseStats.totalRevenueDesc') || 'מכל המקורות',
      icon: DollarSign,
      trend: '+20.1%',
      trendUp: true,
    },
    {
      title: t('purchaseStats.totalTransactions') || 'סה״כ עסקאות',
      value: stats.totalTransactions.toLocaleString('he-IL'),
      description: t('purchaseStats.totalTransactionsDesc') || 'הזמנות, מנויים ושוברים',
      icon: CreditCard,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: t('purchaseStats.totalCustomers') || 'סה״כ לקוחות',
      value: stats.totalCustomers.toLocaleString('he-IL'),
      description: `+${stats.newCustomersThisMonth} ${t('purchaseStats.thisMonth') || 'החודש'}`,
      icon: Users,
      trend: '+5.2%',
      trendUp: true,
    },
    {
      title: t('purchaseStats.averageTransaction') || 'ממוצע עסקה',
      value: formatCurrency(stats.averageTransactionValue),
      description: t('purchaseStats.averageTransactionDesc') || 'ערך ממוצע לעסקה',
      icon: TrendingUp,
      trend: '+8.3%',
      trendUp: true,
    },
    {
      title: t('purchaseStats.bookings') || 'הזמנות',
      value: stats.bookingStats.total.toLocaleString('he-IL'),
      description: `${stats.bookingStats.completed} ${t('purchaseStats.completed') || 'הושלמו'}`,
      icon: Calendar,
      trend: formatCurrency(stats.bookingStats.revenue),
      trendUp: true,
    },
    {
      title: t('purchaseStats.subscriptions') || 'מנויים',
      value: stats.subscriptionStats.total.toLocaleString('he-IL'),
      description: `${stats.subscriptionStats.active} ${t('purchaseStats.active') || 'פעילים'}`,
      icon: Stethoscope,
      trend: formatCurrency(stats.subscriptionStats.revenue),
      trendUp: true,
    },
    {
      title: t('purchaseStats.vouchers') || 'שוברי מתנה',
      value: stats.voucherStats.total.toLocaleString('he-IL'),
      description: `${stats.voucherStats.active} ${t('purchaseStats.active') || 'פעילים'}`,
      icon: Gift,
      trend: formatPercentage(stats.voucherStats.redemptionRate),
      trendUp: stats.voucherStats.redemptionRate > 50,
    },
    {
      title: t('purchaseStats.monthlyGrowth') || 'צמיחה חודשית',
      value: '+15.2%',
      description: t('purchaseStats.monthlyGrowthDesc') || 'לעומת החודש הקודם',
      icon: TrendingUp,
      trend: '+2.4%',
      trendUp: true,
    },
  ]

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.trendUp ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.trendUp ? "text-green-500" : "text-red-500"}>
                  {stat.trend}
                </span>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Revenue Chart Placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('purchaseStats.monthlyRevenue') || 'הכנסות חודשיות'}</CardTitle>
          <CardDescription>
            {t('purchaseStats.monthlyRevenueDesc') || 'פירוט הכנסות לפי חודש וסוג'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {/* Placeholder for chart - can be replaced with actual chart library */}
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('purchaseStats.chartPlaceholder') || 'גרף הכנסות חודשיות'}</p>
              <p className="text-sm mt-2">
                {t('purchaseStats.chartDataAvailable') || 'נתונים זמינים עבור 12 חודשים אחרונים'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('purchaseStats.bookingRevenue') || 'הכנסות מהזמנות'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(stats.bookingStats.revenue)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.totalBookings') || 'סה״כ הזמנות'}:</span>
                <span>{stats.bookingStats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.completedBookings') || 'הזמנות שהושלמו'}:</span>
                <span className="text-green-600">{stats.bookingStats.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.cancelledBookings') || 'הזמנות שבוטלו'}:</span>
                <span className="text-red-600">{stats.bookingStats.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {t('purchaseStats.subscriptionRevenue') || 'הכנסות ממנויים'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(stats.subscriptionStats.revenue)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.totalSubscriptions') || 'סה״כ מנויים'}:</span>
                <span>{stats.subscriptionStats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.activeSubscriptions') || 'מנויים פעילים'}:</span>
                <span className="text-green-600">{stats.subscriptionStats.active}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {t('purchaseStats.voucherRevenue') || 'הכנסות משוברים'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(stats.voucherStats.revenue)}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.totalVouchers') || 'סה״כ שוברים'}:</span>
                <span>{stats.voucherStats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.activeVouchers') || 'שוברים פעילים'}:</span>
                <span className="text-green-600">{stats.voucherStats.active}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('purchaseStats.redemptionRate') || 'שיעור מימוש'}:</span>
                <span className="text-blue-600">{formatPercentage(stats.voucherStats.redemptionRate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 