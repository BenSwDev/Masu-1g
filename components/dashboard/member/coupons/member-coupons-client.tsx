"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Define the form schema for coupon validation
const couponFormSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code must be at most 20 characters"),
})

interface MemberCouponsClientProps {
  initialSearch?: string
  initialPage?: number
  initialSortField?: string
  initialSortDirection?: "asc" | "desc"
}

export default function MemberCouponsClient({
  initialSearch = "",
  initialPage = 1,
  initialSortField = "createdAt",
  initialSortDirection = "desc",
}: MemberCouponsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDirection, setSortDirection] = useState(initialSortDirection)
  
  const [isLoading, setIsLoading] = useState(true)
  const [coupons, setCoupons] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState("available")
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  // Initialize form
  const form = useForm<z.infer<typeof couponFormSchema>>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
    },
  })

// Update URL when filters change
