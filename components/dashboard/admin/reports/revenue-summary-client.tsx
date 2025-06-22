"use client"

import { useState, useEffect } from "react"
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
      setError("Failed to load data")
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
          Revenue Summary
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : totals ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Bookings</TableCell>
                <TableCell className="text-center">{totals.bookings}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Voucher Purchases</TableCell>
                <TableCell className="text-center">{totals.voucherPurchases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Subscription Purchases</TableCell>
                <TableCell className="text-center">{totals.subscriptionPurchases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Total Revenue</TableCell>
                <TableCell className="text-center font-semibold">{totals.totalRevenue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  )
}
