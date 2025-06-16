"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"

import { getAllPurchaseTransactions, getWeeklyAdminTransactionStats } from "@/actions/purchase-summary-actions"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import type { PurchaseTransaction, DailyTransactionStats } from "@/lib/types/purchase-summary"

export default function AdminTransactionsClient() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([])
  const [weekly, setWeekly] = useState<DailyTransactionStats[]>([])
  const [loading, setLoading] = useState(true)



  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const tRes = await getAllPurchaseTransactions(1, 50)
      if (tRes.success && tRes.data) {
        setTransactions(tRes.data.transactions)
      }
      const wRes = await getWeeklyAdminTransactionStats()
      if (wRes.success && wRes.data) setWeekly(wRes.data)
      setLoading(false)
    }
    load()
  }, [])



  return (
    <div className="space-y-6">

      <PurchaseHistoryTable transactions={transactions} isLoading={loading} showCustomerInfo={true} />

      <div>
        <h2 className="font-bold mb-2">סטטיסטיקה שבועית</h2>
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
            {weekly.map(day => (
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
      </div>


    </div>
  )
}
