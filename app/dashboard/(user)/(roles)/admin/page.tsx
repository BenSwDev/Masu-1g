import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export const metadata = {
  title: "לוח בקרה למנהל",
  description: "סקירה מהירה של עסקאות ומשימות הדורשות טיפול מיידי"
}

import {
  getPurchaseStats,
  getAllPurchaseTransactions,
  getWeeklyAdminTransactionStats,
} from "@/actions/purchase-summary-actions"
import { getProfessionals } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import PurchaseStatsOverview from "@/components/common/purchase/purchase-stats-overview"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function AdminDashboardPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const [statsRes, transactionsRes, weeklyRes, pendingProsRes] = await Promise.all([
    getPurchaseStats(),
    getAllPurchaseTransactions(1, 5),
    getWeeklyAdminTransactionStats(),
    getProfessionals({ page: 1, limit: 5, status: "pending_admin_approval", sortBy: "appliedAt", sortOrder: "asc" }),
  ])

  const stats = statsRes.success && statsRes.data ? statsRes.data : null
  const transactions =
    transactionsRes.success && transactionsRes.data
      ? transactionsRes.data.transactions
      : []
  const weekly = weeklyRes.success && weeklyRes.data ? weeklyRes.data : []
  const pendingProfessionals =
    pendingProsRes.success && pendingProsRes.data?.professionals
      ? pendingProsRes.data.professionals
      : []

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading
          title="לוח בקרה למנהל"
          description="סקירה מהירה של עסקאות ומשימות הדורשות טיפול מיידי"
        />
        <Separator />

        {stats && <PurchaseStatsOverview stats={stats} />}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>עסקאות אחרונות</span>
                <Link
                  href="/dashboard/admin/transactions"
                  className="text-sm text-primary flex items-center gap-1"
                >
                  לכל העסקאות
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseHistoryTable
                transactions={transactions}
                isLoading={false}
                showCustomerInfo={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>מטפלים ממתינים לאישור</span>
                <Link
                  href="/dashboard/admin/professional-management"
                  className="text-sm text-primary flex items-center gap-1"
                >
                  לניהול מטפלים
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>אימייל</TableHead>
                    <TableHead>טלפון</TableHead>
                    <TableHead>תאריך הצטרפות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProfessionals.length > 0 ? (
                    pendingProfessionals.map((p: any) => (
                      <TableRow key={p._id}>
                        <TableCell>{p.user.name}</TableCell>
                        <TableCell>{p.user.email}</TableCell>
                        <TableCell>{p.user.phone}</TableCell>
                        <TableCell>
                          {new Date(p.appliedAt).toLocaleDateString("he-IL")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        אין מטפלים ממתינים
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {weekly.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>סטטיסטיקה שבועית</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך</TableHead>
                    <TableHead>הזמנות</TableHead>
                    <TableHead>רכישות מנוי</TableHead>
                    <TableHead>מימוש מנוי</TableHead>
                    <TableHead>מימוש שובר</TableHead>
                    <TableHead>קנסות</TableHead>
                    <TableHead>זיכויים</TableHead>
                    <TableHead>קופונים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekly.map((day: any) => (
                    <TableRow key={day.date}>
                      <TableCell>{day.date}</TableCell>
                      <TableCell>{day.bookings}</TableCell>
                      <TableCell>{day.subscriptionPurchases}</TableCell>
                      <TableCell>{day.subscriptionRedemptions}</TableCell>
                      <TableCell>{day.voucherUsages}</TableCell>
                      <TableCell>{day.penalties}</TableCell>
                      <TableCell>{day.credits}</TableCell>
                      <TableCell>{day.couponUsages}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}

