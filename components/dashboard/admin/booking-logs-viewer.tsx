"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Badge } from "@/components/common/ui/badge"
import { Textarea } from "@/components/common/ui/textarea"
import { Separator } from "@/components/common/ui/separator"
import { 
  Search, 
  Download, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Info,
  Filter,
  Copy,
  Eye
} from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { toast } from "sonner"

interface BookingLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  phase: 'initiation' | 'validation' | 'calculation' | 'creation' | 'payment' | 'confirmation' | 'completion' | 'error'
  bookingId?: string
  userId?: string
  guestEmail?: string
  treatmentId?: string
  amount?: number
  paymentStatus?: string
  error?: any
  metadata?: Record<string, any>
}

interface BookingLogsSummary {
  bookingId: string
  phases: string[]
  duration: number
  errors: number
  warnings: number
  timeline: BookingLog[]
}

export default function BookingLogsViewer() {
  const [logs, setLogs] = useState<BookingLog[]>([])
  const [summary, setSummary] = useState<BookingLogsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: 'booking',
    level: 'all',
    bookingId: '',
    sessionId: '',
    phase: 'all',
    limit: '100'
  })
  const [selectedLog, setSelectedLog] = useState<BookingLog | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        // Convert "all" values to empty strings for the API call
        const apiValue = value === 'all' ? '' : value
        if (apiValue) params.append(key, apiValue)
      })

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setSummary(data.summary)
      } else {
        toast.error("Failed to fetch logs")
      }
    } catch (error) {
      toast.error("Error fetching logs")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const downloadLogs = async (format: 'json' | 'text' = 'text') => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        // Convert "all" values to empty strings for the API call
        const apiValue = value === 'all' ? '' : value
        if (apiValue) params.append(key, apiValue)
      })
      params.append('format', format)

      const response = await fetch(`/api/logs?${params}`)
      
      if (format === 'text') {
        const text = await response.text()
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `booking_logs_${new Date().toISOString().split('T')[0]}.txt`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `booking_logs_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      toast.success("לוגים הורדו בהצלחה")
    } catch (error) {
      toast.error("שגיאה בהורדת הלוגים")
    }
  }

  const copyLogToClipboard = (log: BookingLog) => {
    const logText = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.phase}] ${log.message}
Booking ID: ${log.bookingId || 'N/A'}
User/Email: ${log.userId || log.guestEmail || 'N/A'}
Treatment ID: ${log.treatmentId || 'N/A'}
Amount: ${log.amount || 'N/A'}
Payment Status: ${log.paymentStatus || 'N/A'}
${log.error ? `Error: ${JSON.stringify(log.error, null, 2)}` : ''}
${log.metadata ? `Metadata: ${JSON.stringify(log.metadata, null, 2)}` : ''}`

    navigator.clipboard.writeText(logText)
    toast.success("לוג הועתק")
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info': return <Info className="w-4 h-4 text-blue-500" />
      case 'debug': return <Eye className="w-4 h-4 text-gray-500" />
      default: return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  const getLevelBadge = (level: string) => {
    const colors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      error: 'destructive',
      warn: 'default',
      info: 'secondary',
      debug: 'outline'
    }
    return <Badge variant={colors[level] || 'default'}>{level}</Badge>
  }

  const getPhaseBadge = (phase: string) => {
    const colors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      initiation: 'default',
      validation: 'secondary',
      calculation: 'outline',
      creation: 'default',
      payment: 'secondary',
      confirmation: 'default',
      completion: 'default',
      error: 'destructive'
    }
    return <Badge variant={colors[phase] || 'default'}>{phase}</Badge>
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            לוגי תהליך ההזמנה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input
                id="bookingId"
                value={filters.bookingId}
                onChange={(e) => setFilters(prev => ({ ...prev, bookingId: e.target.value }))}
                placeholder="67abc123..."
              />
            </div>
            
            <div>
              <Label htmlFor="level">רמת לוג</Label>
              <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הרמות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="error">שגיאות</SelectItem>
                  <SelectItem value="warn">אזהרות</SelectItem>
                  <SelectItem value="info">מידע</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phase">שלב</Label>
              <Select value={filters.phase} onValueChange={(value) => setFilters(prev => ({ ...prev, phase: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="כל השלבים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל השלבים</SelectItem>
                  <SelectItem value="initiation">התחלה</SelectItem>
                  <SelectItem value="validation">ולידציה</SelectItem>
                  <SelectItem value="calculation">חישוב מחיר</SelectItem>
                  <SelectItem value="creation">יצירת הזמנה</SelectItem>
                  <SelectItem value="payment">תשלום</SelectItem>
                  <SelectItem value="confirmation">אישור</SelectItem>
                  <SelectItem value="completion">השלמה</SelectItem>
                  <SelectItem value="error">שגיאה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit">מגבלה</Label>
              <Select value={filters.limit} onValueChange={(value) => setFilters(prev => ({ ...prev, limit: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={fetchLogs} disabled={loading} className="flex-1">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                רענן
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => downloadLogs('text')} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                הורד
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>סיכום תהליך הזמנה: {summary.bookingId}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>משך זמן</Label>
                <div className="text-lg font-semibold">{Math.round(summary.duration / 1000)}s</div>
              </div>
              <div>
                <Label>שלבים</Label>
                <div className="text-lg font-semibold">{summary.phases.length}</div>
              </div>
              <div>
                <Label>שגיאות</Label>
                <div className="text-lg font-semibold text-red-500">{summary.errors}</div>
              </div>
              <div>
                <Label>אזהרות</Label>
                <div className="text-lg font-semibold text-yellow-500">{summary.warnings}</div>
              </div>
            </div>
            <div className="mt-4">
              <Label>שלבים שהושלמו:</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {summary.phases.map((phase, index) => (
                  <div key={index}>{getPhaseBadge(phase)}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>לוגים ({logs.length})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadLogs('json')}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadLogs('text')}>
                <Download className="w-4 h-4 mr-2" />
                טקסט
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getLevelIcon(log.level)}
                      {getLevelBadge(log.level)}
                      {getPhaseBadge(log.phase)}
                      <span className="text-sm text-gray-500">
                        {format(new Date(log.timestamp), 'dd/MM HH:mm:ss', { locale: he })}
                      </span>
                    </div>
                    <div className="font-medium mb-1">{log.message}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {log.bookingId && <div>Booking: {log.bookingId}</div>}
                      {log.guestEmail && <div>Email: {log.guestEmail}</div>}
                      {log.amount !== undefined && <div>Amount: ₪{log.amount}</div>}
                      {log.paymentStatus && <div>Payment: {log.paymentStatus}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyLogToClipboard(log)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {log.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <strong>Error:</strong> {JSON.stringify(log.error, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedLog && (
        <Card>
          <CardHeader>
            <CardTitle>פרטי לוג מלאים</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(selectedLog, null, 2)}
              readOnly
              rows={15}
              className="font-mono text-sm"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => copyLogToClipboard(selectedLog)}>
                <Copy className="w-4 h-4 mr-2" />
                העתק
              </Button>
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                סגור
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 