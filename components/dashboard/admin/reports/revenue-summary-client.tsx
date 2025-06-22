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

interface RevenueTotals {
  bookings: number
  voucherPurchases: number
  subscriptionPurchases: number
  totalRevenue: number
}

export default function RevenueSummaryClient() {
  const [timeframe, setTimeframe] = useState("week")
  const [totals, setTotals] = useState<RevenueTotals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getDateRange(timeframe)
      const res = await fetch(`/api/admin/reports/revenue-summary?start=${start.toISOString()}&end=${end.toISOString()}`)
      if (!res.ok) throw new Error("failed")
      const json = await res.json()
      setTotals(json.totals)
    } catch (e) {
      setError(t("reports.revenueSummary.errorLoading"))
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
          {t("reports.revenueSummary.title")}
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
          <div>{t("reports.revenueSummary.loading")}</div>
        ) : error ? (
          <div className="text-red-600">{t("reports.revenueSummary.errorLoading")}</div>
        ) : totals ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.revenueSummary.table.type")}</TableHead>
                <TableHead className="text-center">{t("reports.revenueSummary.table.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{t("reports.revenueSummary.table.bookings")}</TableCell>
                <TableCell className="text-center">{totals.bookings}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t("reports.revenueSummary.table.voucherPurchases")}</TableCell>
                <TableCell className="text-center">{totals.voucherPurchases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t("reports.revenueSummary.table.subscriptionPurchases")}</TableCell>
                <TableCell className="text-center">{totals.subscriptionPurchases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">{t("reports.revenueSummary.table.totalRevenue")}</TableCell>
                <TableCell className="text-center font-semibold">{totals.totalRevenue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  )
}
