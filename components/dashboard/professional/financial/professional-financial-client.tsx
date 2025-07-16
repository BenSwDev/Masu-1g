"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { DollarSign, Calendar, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"

interface ProfessionalFinancialClientProps {
  professionalId: string
}

interface EarningsRecord {
  period: string
  treatments: number
  earnings: number
  adjustments: number
  total: number
  details: Array<{
    bookingId: string
    treatmentName: string
    date: Date
    amount: number
    status: "pending" | "paid"
  }>
}

interface FinancialSummary {
  totalEarnings: number
  pendingPayments: number
  monthlyEarnings: number
  completedTreatments: number
  averageEarningPerTreatment: number
}

export default function ProfessionalFinancialClient({ professionalId }: ProfessionalFinancialClientProps) {
  const [timeFrame, setTimeFrame] = useState<"day" | "week" | "month">("month")
  
  const {
    data: financialData,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    summary: FinancialSummary
    records: EarningsRecord[]
    success: boolean
    error?: string
  }>({
    queryKey: ["professionalFinancial", professionalId, timeFrame],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/professional/financial?timeFrame=${timeFrame}`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch financial data")
        }
        
        return result
      } catch (error) {
        console.error("Error fetching professional financial data:", error)
        throw error
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  })

  const formatCurrency = (amount: number) => {
    return `₪${amount.toFixed(0)}`
  }

  const formatDate = (date: string | Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const getPaymentStatusBadge = (status: "pending" | "paid") => {
    if (status === "paid") {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          שולם
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-800">
        <Clock className="w-3 h-3 mr-1" />
        ממתין
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !financialData?.success) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת הנתונים הכספיים</h3>
        <p className="text-muted-foreground mb-4">אירעה שגיאה בעת טעינת הנתונים הכספיים שלך</p>
      </div>
    )
  }

  const { summary, records } = financialData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הסיכום הכספי שלי</h1>
          <p className="text-muted-foreground">מעקב אחר הרווחים והתשלומים שלך</p>
        </div>
        <Select value={timeFrame} onValueChange={(value: "day" | "week" | "month") => setTimeFrame(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">יומי</SelectItem>
            <SelectItem value="week">שבועי</SelectItem>
            <SelectItem value="month">חודשי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              סה"כ רווחים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalEarnings)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              תשלומים ממתינים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.pendingPayments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              רווחים החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.monthlyEarnings)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              טיפולים שהושלמו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {summary.completedTreatments}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            פירוט רווחים לפי תקופה
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תקופה</TableHead>
                  <TableHead>מספר טיפולים</TableHead>
                  <TableHead>רווחים מטיפולים</TableHead>
                  <TableHead>התאמות</TableHead>
                  <TableHead>סה"כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.period}>
                    <TableCell className="font-medium">{record.period}</TableCell>
                    <TableCell>{record.treatments}</TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(record.earnings)}
                    </TableCell>
                    <TableCell className={record.adjustments >= 0 ? "text-blue-600" : "text-red-600"}>
                      {record.adjustments >= 0 ? "+" : ""}{formatCurrency(record.adjustments)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(record.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">אין נתונים כספיים</h3>
              <p className="text-muted-foreground">
                עדיין לא השלמת טיפולים או שלא התקבלו תשלומים
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {records && records.length > 0 && records.some(r => r.details && r.details.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              תשלומים אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>טיפול</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records
                  .flatMap(r => r.details || [])
                  .slice(0, 10) // Show latest 10 payments
                  .map((detail, index) => (
                    <TableRow key={`${detail.bookingId}-${index}`}>
                      <TableCell>{formatDate(detail.date)}</TableCell>
                      <TableCell>{detail.treatmentName}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(detail.amount)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(detail.status)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">חשוב לדעת</h4>
              <p className="text-sm text-blue-700">
                הסכומים המוצגים כאן הם רק התשלומים המגיעים לך כמטפל. 
                המידע הכספי של הלקוחות אינו נגיש לך מטעמי פרטיות.
                התשלומים יועברו אליך לפי לוח הזמנים הקבוע.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 