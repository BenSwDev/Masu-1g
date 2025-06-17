"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { getProfessionalList, adminAdjustProfessionalBalance } from "@/actions/professional-actions"
import { getWeeklyTransactionSummary, getDailyTransactionDetails, type WeeklyTransactionSummary, type DailyTransactionDetail } from "@/actions/transaction-actions"

export default function AdminTransactionsClient() {
  const { toast } = useToast()
  const [weeklyData, setWeeklyData] = useState<WeeklyTransactionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDateDetails, setSelectedDateDetails] = useState<DailyTransactionDetail[]>([])
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")

  const [modalOpen, setModalOpen] = useState(false)
  const [professionals, setProfessionals] = useState<{id:string,name:string}[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<string>("")
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const wRes = await getWeeklyTransactionSummary()
      if (wRes.success && wRes.data) {
        setWeeklyData(wRes.data)
      }
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

  const handleRowClick = async (date: string) => {
    setSelectedDate(date)
    const res = await getDailyTransactionDetails(date)
    if (res.success && res.data) {
      setSelectedDateDetails(res.data)
      setDetailsModalOpen(true)
    } else {
      toast({ title: "שגיאה", description: res.error || "" , variant: "destructive" })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'booking': return 'הזמנה'
      case 'gift_voucher': return 'שובר מתנה'
      case 'subscription': return 'מנוי'
      default: return type
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'הושלם'
      case 'pending': return 'ממתין'
      case 'cancelled': return 'בוטל'
      case 'refunded': return 'הוחזר'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Button onClick={openModal}>זיכוי/קנס מטפל</Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">דוח עסקאות שבועי</h2>
        <p className="text-sm text-gray-600 mb-4">לחץ על שורה לצפייה בפירוט העסקאות של היום</p>
        
        <div className="overflow-x-auto">
                      <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">הזמנות</TableHead>
                  <TableHead className="text-right">שוברי מתנה</TableHead>
                  <TableHead className="text-right">מנויים</TableHead>
                  <TableHead className="text-right">כמות טיפולים</TableHead>
                  <TableHead className="text-right">תשלום למטפלים</TableHead>
                  <TableHead className="text-right">הכנסה ישירה (נטו)</TableHead>
                  <TableHead className="text-right">שוברים פרטיים - ניצול</TableHead>
                  <TableHead className="text-right">מנויים - ניצול</TableHead>
                  <TableHead className="text-right">שוברי ספקים</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4">
                    טוען נתונים...
                  </TableCell>
                </TableRow>
              ) : weeklyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4">
                    אין נתונים להצגה
                  </TableCell>
                </TableRow>
              ) : (
                weeklyData.map((day) => (
                  <TableRow 
                    key={day.date} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(day.date)}
                  >
                    <TableCell className="font-medium">
                      {day.dayName} ({new Date(day.date).toLocaleDateString('he-IL')})
                    </TableCell>
                    <TableCell>{day.bookingsSalesCount}</TableCell>
                    <TableCell>{day.vouchersSalesCount}</TableCell>
                    <TableCell>{day.subscriptionsSalesCount}</TableCell>
                    <TableCell>{day.treatmentCount}</TableCell>
                    <TableCell>{formatCurrency(day.professionalPayments)}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(day.directRevenue)}
                    </TableCell>
                    <TableCell>{day.privateVoucherUsage}</TableCell>
                    <TableCell>{day.subscriptionUsage}</TableCell>
                    <TableCell>
                      {day.partnerVoucherUsage.count} / {formatCurrency(day.partnerVoucherUsage.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {weeklyData.length > 0 && (
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell>סך הכל</TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.bookingsSalesCount, 0)}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.vouchersSalesCount, 0)}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.subscriptionsSalesCount, 0)}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.treatmentCount, 0)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(weeklyData.reduce((sum, day) => sum + day.professionalPayments, 0))}
                  </TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(weeklyData.reduce((sum, day) => sum + day.directRevenue, 0))}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.privateVoucherUsage, 0)}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.subscriptionUsage, 0)}
                  </TableCell>
                  <TableCell>
                    {weeklyData.reduce((sum, day) => sum + day.partnerVoucherUsage.count, 0)} / 
                    {formatCurrency(weeklyData.reduce((sum, day) => sum + day.partnerVoucherUsage.revenue, 0))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Professional Balance Modal */}
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

      {/* Daily Transaction Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              פירוט עסקאות ליום {selectedDate ? new Date(selectedDate).toLocaleDateString('he-IL') : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateDetails.length === 0 ? (
              <p className="text-center py-4">אין עסקאות ליום זה</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מספר עסקה</TableHead>
                    <TableHead className="text-right">סוג</TableHead>
                    <TableHead className="text-right">שעה</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDateDetails.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono font-medium">
                        {transaction.transactionNumber}
                      </TableCell>
                      <TableCell>{getTransactionTypeText(transaction.type)}</TableCell>
                      <TableCell>{transaction.time}</TableCell>
                      <TableCell className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </TableCell>
                      <TableCell>{transaction.customerName || 'לא ידוע'}</TableCell>
                      <TableCell>
                        {transaction.finalAmount ? 
                          formatCurrency(transaction.finalAmount) : 
                          formatCurrency(transaction.amount)
                        }
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
