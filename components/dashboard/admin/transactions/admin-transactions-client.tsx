"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { getProfessionalList, adminAdjustProfessionalBalance } from "@/actions/professional-actions"
import { getAllPurchaseTransactions, getWeeklyAdminTransactionStats } from "@/actions/purchase-summary-actions"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import type { PurchaseTransaction, DailyTransactionStats } from "@/lib/types/purchase-summary"

export default function AdminTransactionsClient() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([])
  const [weekly, setWeekly] = useState<DailyTransactionStats[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [professionals, setProfessionals] = useState<{id:string,name:string}[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [amount, setAmount] = useState(0)

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

    const openModal = async () => {
      const res = await getProfessionalList()
      if (res.success && res.data?.professionals) {
        setProfessionals(res.data.professionals)
        setModalOpen(true)
      } else {
      toast({ title: "שגיאה", description: res.error || "" , variant: "destructive" })
    }
  }

  const handleSubmit = async () => {
    if (!selectedProfessional) return
    const result = await adminAdjustProfessionalBalance(selectedProfessional, amount)
    if (result.success) {
      toast({ title: "עודכן" })
      setModalOpen(false)
    } else {
      toast({ title: "שגיאה", description: result.error || "" , variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Button onClick={openModal}>זיכוי/קנס מטפל</Button>
      </div>

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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>זיכוי/קנס מטפל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מטפל" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="סכום" />
            <Button onClick={handleSubmit}>שמור</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
