"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"

function getDateRange(frame: string) {
  const now = new Date()
  const end = now
  let start = new Date(now)
  switch (frame) {
    case "day":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "week":
      start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      break
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "year":
      start = new Date(now.getFullYear(), 0, 1)
      break
  }
  return { start, end }
}

export default function BookingsPerProfessionalClient() {
  const [timeframe, setTimeframe] = useState("week")
  const [data, setData] = useState<Array<{ professionalId: string; count: number }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getDateRange(timeframe)
      const res = await fetch(`/api/admin/reports/bookings-per-professional?start=${start.toISOString()}&end=${end.toISOString()}`)
      if (!res.ok) throw new Error("failed")
      const json = await res.json()
      setData(json.data || [])
    } catch (e) {
      setError("reports.bookingsByProfessional.errorLoading")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeframe])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("reports.bookingsByProfessional.title")}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("reports.timeframes.day")}</SelectItem>
              <SelectItem value="week">{t("reports.timeframes.week")}</SelectItem>
              <SelectItem value="month">{t("reports.timeframes.month")}</SelectItem>
              <SelectItem value="year">{t("reports.timeframes.year")}</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>{t("reports.bookingsByProfessional.loading")}</div>
        ) : error ? (
          <div className="text-red-600">{t(error)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.bookingsByProfessional.table.professional")}</TableHead>
                <TableHead className="text-center">{t("reports.bookingsByProfessional.table.bookings")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.professionalId}>
                  <TableCell>{row.professionalId}</TableCell>
                  <TableCell className="text-center">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
