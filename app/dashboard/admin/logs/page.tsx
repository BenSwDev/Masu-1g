"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { RefreshCw, Download, Search, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LogEvent {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, any>
  userId?: string
  requestId?: string
  route?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<{
    level?: string
    userId?: string
    search?: string
  }>({})
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.level) params.append('level', filter.level)
      if (filter.userId) params.append('userId', filter.userId)
      params.append('limit', '200')

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        let filteredLogs = data.logs

        // Client-side search filter
        if (filter.search) {
          filteredLogs = filteredLogs.filter((log: LogEvent) =>
            log.message.toLowerCase().includes(filter.search!.toLowerCase()) ||
            log.route?.toLowerCase().includes(filter.search!.toLowerCase())
          )
        }

        setLogs(filteredLogs)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "לא ניתן לטעון את הלוגים"
        })
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת הלוגים"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.route || 'unknown'}: ${log.message}${
        log.context ? '\nContext: ' + JSON.stringify(log.context, null, 2) : ''
      }`
    ).join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masu-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive'
      case 'warn': return 'secondary'
      case 'info': return 'default'
      case 'debug': return 'outline'
      default: return 'default'
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filter.level, filter.userId])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">לוגי מערכת</h1>
        <div className="flex gap-2">
          <Button onClick={downloadLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            הורדה
          </Button>
          <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            רענון
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            סינונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">רמת לוג</label>
              <Select 
                value={filter.level || "all"} 
                onValueChange={(value) => 
                  setFilter(prev => ({ ...prev, level: value === "all" ? undefined : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="כל הרמות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="error">שגיאות</SelectItem>
                  <SelectItem value="warn">אזהרות</SelectItem>
                  <SelectItem value="info">מידע</SelectItem>
                  <SelectItem value="debug">דיבוג</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">משתמש</label>
              <Input
                placeholder="ID משתמש"
                value={filter.userId || ""}
                onChange={(e) => setFilter(prev => ({ ...prev, userId: e.target.value || undefined }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">חיפוש</label>
              <Input
                placeholder="חיפוש בהודעות..."
                value={filter.search || ""}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value || undefined }))}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={fetchLogs} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                חיפוש
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <CardTitle>לוגים ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? "טוען לוגים..." : "לא נמצאו לוגים"}
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        {log.route && (
                          <Badge variant="outline">{log.route}</Badge>
                        )}
                        {log.requestId && (
                          <Badge variant="outline" className="text-xs">
                            {log.requestId.slice(0, 8)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('he-IL')}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      {log.message}
                    </div>
                    
                    {log.context && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          פרטים נוספים
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 
