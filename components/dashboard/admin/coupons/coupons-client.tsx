"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Check, Edit, Plus, Search, Trash, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getAdminCoupons,
  getCouponById,
  type CouponFormData,
} from "@/actions/coupon-actions"

// Define the form schema
const formSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code must be at most 20 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0, "Discount value must be at least 0"),
  minPurchaseAmount: z.number().min(0, "Minimum purchase amount must be at least 0"),
  maxDiscountAmount: z.number().min(0, "Maximum discount amount must be at least 0"),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean(),
  usageLimit: z.number().min(0, "Usage limit must be at least 0"),
  applicableTreatments: z.array(z.string()).min(0),
  partnerId: z.string().optional(),
})

type CouponFormValues = z.infer<typeof formSchema>

interface CouponsClientProps {
  initialSearch?: string
  initialPage?: number
  initialSortField?: string
  initialSortDirection?: "asc" | "desc"
  initialFilterActive?: boolean
  treatments: any[]
  partners: any[]
}

export default function CouponsClient({
  initialSearch = "",
  initialPage = 1,
  initialSortField = "createdAt",
  initialSortDirection = "desc",
  initialFilterActive,
  treatments = [],
  partners = [],
}: CouponsClientProps) {
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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      isActive: true,
      usageLimit: 0,
      applicableTreatments: [],
      partnerId: undefined,
    },
  })

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
      const response = await getAdminCoupons(search, sortField, sortDirection, page, 10, filterActive)
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

  // Open dialog for creating/editing coupon
  const openDialog = async (coupon?: any) => {
    if (coupon) {
      // Editing existing coupon
      setSelectedCoupon(coupon)
      try {
        const response = await getCouponById(coupon._id)
        if (response.success && response.coupon) {
          const couponData = response.coupon
          form.reset({
            code: couponData.code,
            description: couponData.description,
            discountType: couponData.discountType,
            discountValue: couponData.discountValue,
            minPurchaseAmount: couponData.minPurchaseAmount,
            maxDiscountAmount: couponData.maxDiscountAmount,
            startDate: new Date(couponData.startDate),
            endDate: new Date(couponData.endDate),
            isActive: couponData.isActive,
            usageLimit: couponData.usageLimit,
            applicableTreatments: couponData.applicableTreatments.map((t: any) => t._id.toString()),
            partnerId: couponData.partnerId ? couponData.partnerId._id.toString() : undefined,
          })
        }
      } catch (error) {
        console.error("Error fetching coupon details:", error)
        toast({
          title: t("common.error"),
          description: t("coupons.fetchDetailError"),
          variant: "destructive",
        })
      }
    } else {
      // Creating new coupon
      setSelectedCoupon(null)
      form.reset({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: 0,
        minPurchaseAmount: 0,
        maxDiscountAmount: 0,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        isActive: true,
        usageLimit: 0,
        applicableTreatments: [],
        partnerId: undefined,
      })
    }
    setIsDialogOpen(true)
  }

  // Handle form submission
  const onSubmit = async (values: CouponFormValues) => {
    setIsSubmitting(true)
    try {
      let response

      if (selectedCoupon) {
        // Update existing coupon
        response = await updateCoupon(selectedCoupon._id, values as CouponFormData)
      } else {
        // Create new coupon
        response = await createCoupon(values as CouponFormData)
      }

      if (response.success) {
        toast({
          title: t("common.success"),
          description: selectedCoupon ? t("coupons.updateSuccess") : t("coupons.createSuccess"),
        })
        setIsDialogOpen(false)
        fetchCoupons()
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting coupon:", error)
      toast({
        title: t("common.error"),
        description: t("coupons.submitError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle coupon deletion
  const handleDeleteCoupon = async () => {
    if (!selectedCoupon) return

    try {
      const response = await deleteCoupon(selectedCoupon._id)

      if (response.success) {
        toast({
          title: t("common.success"),
          description: t("coupons.deleteSuccess"),
        })
        setIsDeleteDialogOpen(false)
        fetchCoupons()
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting coupon:", error)
      toast({
        title: t("common.error"),
        description: t("coupons.deleteError"),
        variant: "destructive",
      })
    }
  }

  // Handle toggling coupon status
  const handleToggleStatus = async (couponId: string) => {
    try {
      const response = await toggleCouponStatus(couponId)

      if (response.success) {
        toast({
          title: t("common.success"),
          description: response.message,
        })
        fetchCoupons()
      } else {
        toast({
          title: t("common.error"),
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling coupon status:", error)
      toast({
        title: t("common.error"),
        description: t("coupons.statusUpdateError"),
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t("coupons.title")}</h1>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t("coupons.addNew")}
          </Button>
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
                <SelectItem value="usedCount">{t("coupons.fields.usedCount")}</SelectItem>
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
                      {t("coupons.noCoupons")}
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
                        {coupon.usageLimit > 0
                          ? `${coupon.usedCount} / ${coupon.usageLimit}`
                          : `${coupon.usedCount} / ∞`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleStatus(coupon._id)}
                            title={coupon.isActive ? t("common.deactivate") : t("common.activate")}
                          >
                            {coupon.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDialog(coupon)}
                            title={t("common.edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedCoupon(coupon)
                              setIsDeleteDialogOpen(true)
                            }}
                            title={t("common.delete")}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Create/Edit Coupon Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCoupon ? t("coupons.edit") : t("coupons.addNew")}</DialogTitle>
            <DialogDescription>{t("coupons.formDescription")}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("coupons.fields.code")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>{t("coupons.fields.isActive")}</FormLabel>
                        <FormDescription>{t("coupons.activeDescription")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("coupons.fields.description")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("coupons.fields.discountType")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("coupons.fields.selectDiscountType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">{t("coupons.fields.percentage")}</SelectItem>
                          <SelectItem value="fixed">{t("coupons.fields.fixed")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("coupons.fields.discountValue")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={field.value === "percentage" ? 1 : 0.01}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minPurchaseAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("coupons.fields.minPurchaseAmount")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>{t("coupons.minPurchaseDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDiscountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("coupons.fields.maxDiscountAmount")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>{t("coupons.maxDiscountDescription")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("coupons.fields.startDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? format(field.value, "PPP") : <span>{t("coupons.fields.selectDate")}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("coupons.fields.endDate")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? format(field.value, "PPP") : <span>{t("coupons.fields.selectDate")}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("coupons.fields.usageLimit")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>{t("coupons.usageLimitDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("coupons.fields.partner")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("coupons.fields.selectPartner")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("coupons.fields.noPartner")}</SelectItem>
                        {partners.map((partner) => (
                          <SelectItem key={partner._id} value={partner._id}>
                            {partner.name} ({partner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("coupons.partnerDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicableTreatments"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">{t("coupons.fields.applicableTreatments")}</FormLabel>
                      <FormDescription>{t("coupons.treatmentsDescription")}</FormDescription>
                    </div>
                    {treatments.length === 0 ? (
                      <div className="text-muted-foreground">{t("coupons.noTreatmentsAvailable")}</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {treatments.map((treatment) => (
                          <FormField
                            key={treatment._id}
                            control={form.control}
                            name="applicableTreatments"
                            render={({ field }) => {
                              return (
                                <FormItem key={treatment._id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(treatment._id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, treatment._id])
                                          : field.onChange(field.value?.filter((value) => value !== treatment._id))
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {treatment.name} (${treatment.price.toFixed(2)})
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("coupons.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("coupons.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCoupon}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
