"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { Copy, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { getPartnerCoupons } from "@/actions/coupon-actions"

interface PartnerCouponsClientProps {
  initialSearch?: string
  initialPage?: number
  initialSortField?: string
  initialSortDirection?: "asc" | "desc"
  initialFilterActive?: boolean
}

export default function PartnerCouponsClient({
  initialSearch = "",
  initialPage = 1,
  initialSortField = "createdAt",
  initialSortDirection = "desc",
  initialFilterActive,
}: PartnerCouponsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDirection, setSortDirection] = useState(initialSortDirection)
  const [filterActive, setFilterActive] = useState<boolean | undefined>(initialFilterActive)

  const [isLoading, setIsLoading] = useState(true)
  const [coupons, setCoupons] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams)

    if (search) params.set("search", search)
    else params.delete("search")

    params.set("page", page.toString())
    params.set("sortField", sortField)
    params.set("sortDirection", sortDirection)

    if (filterActive !== undefined) {
      params.set("status", filterActive ? "active" : "inactive")
    } else {
      params.delete("status")
    }

    router.push(`${pathname}?${params.toString()}`)

    // Fetch coupons
    fetchCoupons()
  }, [search, page, sortField, sortDirection, filterActive])

  // Fetch coupons
  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const response = await getPartnerCoupons(search, sortField, sortDirection, page, 10, filterActive)
      if (response.success) {
        setCoupons(response.coupons || [])
        setTotalPages(response.totalPages || 1)
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching coupons:", error)
      toast({
        title: t("common.error"),
        description: t("coupons.fetchError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPage(1) // Reset to first page on new search
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setPage(1) // Reset to first page on sort change
  }

  // Handle filter
  const handleFilterChange = (value: string) => {
    if (value === "all") {
      setFilterActive(undefined)
    } else if (value === "active") {
      setFilterActive(true)
    } else {
      setFilterActive(false)
    }
    setPage(1) // Reset to first page on filter change
  }

  // Copy coupon code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: t("coupons.codeCopied"),
      description: code,
    })
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("coupons.partnerTitle")}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
          <Input
            placeholder={t("coupons.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex gap-2 w-full md:w-auto">
          <Select
            value={filterActive === undefined ? "all" : filterActive ? "active" : "inactive"}
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="active">{t("common.active")}</SelectItem>
              <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortField}
            onValueChange={(value) => {
              setSortField(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t("common.sortField")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">{t("coupons.fields.code")}</SelectItem>
              <SelectItem value="discountValue">{t("coupons.fields.discountValue")}</SelectItem>
              <SelectItem value="startDate">{t("coupons.fields.startDate")}</SelectItem>
              <SelectItem value="endDate">{t("coupons.fields.endDate")}</SelectItem>
              <SelectItem value="createdAt">{t("common.created")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortDirection}
            onValueChange={(value: "asc" | "desc") => {
              setSortDirection(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t("common.sortDirection")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t("coupons.sortAscending")}</SelectItem>
              <SelectItem value="desc">{t("coupons.sortDescending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("coupons.fields.code")}</TableHead>
                <TableHead>{t("coupons.fields.description")}</TableHead>
                <TableHead>{t("coupons.fields.discount")}</TableHead>
                <TableHead>{t("coupons.fields.validity")}</TableHead>
                <TableHead>{t("coupons.fields.usage")}</TableHead>
                <TableHead>{t("coupons.fields.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t("coupons.noPartnerCoupons")}
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon._id}>
                    <TableCell className="font-medium">{coupon.code}</TableCell>
                    <TableCell>{coupon.description}</TableCell>
                    <TableCell>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : `$${coupon.discountValue.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(coupon.startDate), "dd/MM/yyyy")}</span>
                        <span>{format(new Date(coupon.endDate), "dd/MM/yyyy")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.usageLimit > 0 ? `${coupon.usedCount} / ${coupon.usageLimit}` : `${coupon.usedCount} / ∞`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.isActive ? "default" : "secondary"}>
                        {coupon.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(coupon.code)}
                        title={t("coupons.copy")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex justify-center py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink onClick={() => setPage(pageNum)} isActive={page === pageNum}>
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
