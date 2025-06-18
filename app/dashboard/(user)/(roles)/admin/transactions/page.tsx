import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { BarChart3, TrendingUp, CreditCard, Activity } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "עסקאות",
  description: "צפייה בכל העסקאות במערכת"
}

const mockTransactions = [
  { id: "1", date: "2024-01-15", type: "הזמנה", amount: 250, status: "הושלם", customer: "יוחנן כהן" },
  { id: "2", date: "2024-01-14", type: "מנוי", amount: 500, status: "הושלם", customer: "שרה לוי" },
  { id: "3", date: "2024-01-14", type: "שובר מתנה", amount: 150, status: "ממתין", customer: "דן ישראלי" },
  { id: "4", date: "2024-01-13", type: "הזמנה", amount: 180, status: "הושלם", customer: "מרים חן" },
  { id: "5", date: "2024-01-13", type: "מנוי", amount: 300, status: "נכשל", customer: "עמית רון" },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "הושלם":
      return <Badge variant="default">הושלם</Badge>
    case "ממתין":
      return <Badge variant="secondary">ממתין</Badge>
    case "נכשל":
      return <Badge variant="destructive">נכשל</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function TransactionsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">עסקאות</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ עסקאות היום</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">+12% מאתמול</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הכנסות היום</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪3,245</div>
            <p className="text-xs text-muted-foreground">+8.2% מאתמול</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">עסקאות מוצלחות</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95.2%</div>
            <p className="text-xs text-muted-foreground">שיעור הצלחה</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממוצע עסקה</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪156</div>
            <p className="text-xs text-muted-foreground">+3.1% מהחודש שעבר</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>עסקאות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מזהה עסקה</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סוג עסקה</TableHead>
                <TableHead>סכום</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>לקוח</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">#{transaction.id}</TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>₪{transaction.amount}</TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>{transaction.customer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="text-center py-8 text-muted-foreground border-t mt-4">
            <Activity className="mx-auto h-16 w-16 mb-4 opacity-50" />
            <p>בקרוב: רשימה מלאה של כל העסקאות והמימושים</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 