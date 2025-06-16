"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { DollarSign, TrendingUp, TrendingDown, Calendar, Plus, Filter, Download } from "lucide-react"

interface FinancialTransaction {
  date: string
  type: "booking_payment" | "bonus" | "penalty" | "adjustment"
  amount: number
  description: string
  bookingId?: string
  adminNote?: string
}

interface Professional {
  _id: string
  totalEarnings: number
  pendingPayments: number
  financialTransactions: FinancialTransaction[]
}

interface ProfessionalFinancialTabProps {
  professional: Professional
  onUpdate: (professional: Professional) => void
}

export default function ProfessionalFinancialTab({
  professional,
  onUpdate
}: ProfessionalFinancialTabProps) {
  const { t, dir } = useTranslation()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date")

  const transactions = professional.financialTransactions || []

  const getTransactionBadge = (type: string) => {
    const typeConfig: Record<string, { variant: any, text: string, icon: any }> = {
      booking_payment: { variant: "default", text: "תשלום הזמנה", icon: DollarSign },
      bonus: { variant: "default", text: "בונוס", icon: TrendingUp },
      penalty: { variant: "destructive", text: "קנס", icon: TrendingDown },
      adjustment: { variant: "secondary", text: "התאמה", icon: DollarSign }
    }

    const config = typeConfig[type] || { variant: "outline", text: type, icon: DollarSign }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString()}`
  }

  const filteredTransactions = transactions.filter(transaction => 
    typeFilter === "all" || transaction.type === typeFilter
  )

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    if (sortBy === "amount") {
      return Math.abs(b.amount) - Math.abs(a.amount)
    }
    return 0
  })

  // Statistics
  const stats = {
    totalEarnings: professional.totalEarnings,
    pendingPayments: professional.pendingPayments,
    totalTransactions: transactions.length,
    thisMonthEarnings: transactions
      .filter(t => {
        const transactionDate = new Date(t.date)
        const now = new Date()
        return transactionDate.getMonth() === now.getMonth() && 
               transactionDate.getFullYear() === now.getFullYear() &&
               (t.type === 'booking_payment' || t.type === 'bonus')
      })
      .reduce((sum, t) => sum + t.amount, 0),
    totalBonuses: transactions
      .filter(t => t.type === 'bonus')
      .reduce((sum, t) => sum + t.amount, 0),
    totalPenalties: transactions
      .filter(t => t.type === 'penalty')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }

  const handleAddTransaction = () => {
    // TODO: Implement add transaction functionality
    console.log("Add transaction clicked")
  }

  const handleExportTransactions = () => {
    // TODO: Implement export functionality
    console.log("Export transactions clicked")
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">סה"כ רווחים</div>
                <div className="font-semibold text-green-600">{formatCurrency(stats.totalEarnings)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">החודש</div>
                <div className="font-semibold text-blue-600">{formatCurrency(stats.thisMonthEarnings)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">בונוסים</div>
                <div className="font-semibold text-purple-600">{formatCurrency(stats.totalBonuses)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-sm text-muted-foreground">קנסות</div>
                <div className="font-semibold text-red-600">{formatCurrency(stats.totalPenalties)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {stats.pendingPayments > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-medium text-orange-800">תשלומים ממתינים</div>
                  <div className="text-sm text-orange-600">
                    יש תשלומים ממתינים לעיבוד
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.pendingPayments)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="סנן לפי סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="booking_payment">תשלום הזמנה</SelectItem>
                  <SelectItem value="bonus">בונוס</SelectItem>
                  <SelectItem value="penalty">קנס</SelectItem>
                  <SelectItem value="adjustment">התאמה</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="מיין לפי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">תאריך (חדש לישן)</SelectItem>
                  <SelectItem value="amount">סכום (גבוה לנמוך)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExportTransactions} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                ייצא
              </Button>
              <Button onClick={handleAddTransaction} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                הוסף תנועה
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            תנועות כספיות ({sortedTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {typeFilter !== "all" ? "אין תנועות מסוננות" : "אין תנועות כספיות"}
              </h3>
              <p className="text-sm mb-4">
                {typeFilter !== "all"
                  ? "לא נמצאו תנועות מהסוג הנבחר"
                  : "עדיין לא בוצעו תנועות כספיות"
                }
              </p>
              <Button onClick={handleAddTransaction} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                הוסף תנועה ראשונה
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סוג תנועה</TableHead>
                  <TableHead>תיאור</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>הזמנה</TableHead>
                  <TableHead>הערות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(transaction.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTransactionBadge(transaction.type)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.bookingId ? (
                        <Badge variant="outline" className="text-xs">
                          #{transaction.bookingId}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.adminNote ? (
                        <div className="text-sm text-muted-foreground max-w-48 truncate">
                          {transaction.adminNote}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 