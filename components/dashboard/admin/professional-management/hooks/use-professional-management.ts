"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/common/ui/use-toast"
import { getProfessionals, createEmptyProfessional } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional, ProfessionalStats, PaginationInfo } from "@/lib/types/professional"
import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"

interface UseProfessionalManagementOptions {
  initialProfessionals?: Professional[]
  initialStats?: ProfessionalStats
  initialPage?: number
  initialSearch?: string
}

interface ProfessionalManagementState {
  professionals: Professional[]
  stats: ProfessionalStats
  pagination: PaginationInfo
  loading: boolean
  refreshing: boolean
  error: string | null
  
  // Filters
  searchTerm: string
  statusFilter: ProfessionalStatus | "all"
  sortBy: string
  sortOrder: "asc" | "desc"
  
  // Actions
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: ProfessionalStatus | "all") => void
  setSortBy: (sortBy: string) => void
  setSortOrder: (order: "asc" | "desc") => void
  refreshData: () => Promise<void>
  loadPage: (page: number) => Promise<void>
  updateProfessional: (id: string, updates: Partial<Professional>) => void
  navigateToEdit: (id: string) => void
  navigateToCreate: () => Promise<void>
}

export function useProfessionalManagement(options: UseProfessionalManagementOptions = {}): ProfessionalManagementState {
  const { 
    initialProfessionals = [], 
    initialStats = { total: 0, active: 0, byStatus: {} },
    initialPage = 1,
    initialSearch = ""
  } = options

  const router = useRouter()
  const { toast } = useToast()

  // State
  const [professionals, setProfessionals] = useState<Professional[]>(initialProfessionals)
  const [stats, setStats] = useState<ProfessionalStats>(initialStats)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: initialPage,
    limit: 10,
    total: 0,
    pages: 1
  })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<ProfessionalStatus | "all">("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadData = useCallback(async (page: number = 1, limit: number = 10, search?: string, status?: ProfessionalStatus | "all", sortField?: string, sortDirection?: "asc" | "desc") => {
    setLoading(true)
    setError(null)

    try {
      const result = await getProfessionals({
        page,
        limit,
        search: search ?? debouncedSearchTerm,
        status: (status ?? statusFilter) === "all" ? undefined : (status ?? statusFilter) as ProfessionalStatus,
        sortBy: sortField ?? sortBy,
        sortOrder: sortDirection ?? sortOrder
      })

      if (result.success && result.data) {
        // Transform the database types to Professional interface with proper type conversion
        const transformedProfessionals = result.data.professionals.map(professional => {
          const prof = professional as any
          return {
            ...prof,
            _id: prof._id.toString(),
            userId: typeof prof.userId === 'object' ? {
              ...prof.userId,
              _id: prof.userId._id.toString()
            } : prof.userId
          }
        }) as Professional[]
        
        setProfessionals(transformedProfessionals)
        setStats(result.data.stats)
        setPagination({
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          total: result.data.pagination.total,
          pages: result.data.pagination.pages
        })
      } else {
        setError(result.error || "שגיאה בטעינת נתונים")
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בטעינת נתונים"
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת נתונים"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Load data when filters change
  useEffect(() => {
    if (debouncedSearchTerm !== initialSearch || statusFilter !== "all" || sortBy !== "createdAt" || sortOrder !== "desc") {
      loadData(1, 10, debouncedSearchTerm, statusFilter, sortBy, sortOrder)
    }
  }, [debouncedSearchTerm, statusFilter, sortBy, sortOrder, loadData, initialSearch])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadData(pagination.page, pagination.limit, debouncedSearchTerm, statusFilter, sortBy, sortOrder)
      toast({
        title: "הצלחה",
        description: "הנתונים רוענו בהצלחה"
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ברענון הנתונים"
      })
    } finally {
      setRefreshing(false)
    }
  }, [loadData, pagination.page, pagination.limit, toast, debouncedSearchTerm, statusFilter, sortBy, sortOrder])

  const loadPage = useCallback(async (page: number) => {
    await loadData(page, pagination.limit, debouncedSearchTerm, statusFilter, sortBy, sortOrder)
  }, [loadData, pagination.limit, debouncedSearchTerm, statusFilter, sortBy, sortOrder])

  const updateProfessional = useCallback((id: string, updates: Partial<Professional>) => {
    setProfessionals(prev => 
      prev.map(professional => 
        professional._id === id 
          ? { ...professional, ...updates }
          : professional
      )
    )
  }, [])

  const navigateToEdit = useCallback((id: string) => {
    router.push(`/dashboard/admin/professional-management/${id}`)
  }, [router])

  const navigateToCreate = useCallback(async () => {
    try {
      // Show loading state
      setLoading(true)
      
      // Create empty professional in database
      const result = await createEmptyProfessional()
      
      if (result.success && result.professional) {
        // Navigate to edit page with the real professional ID
        router.push(`/dashboard/admin/professional-management/${result.professional._id}`)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה ביצירת המטפל"
        })
      }
    } catch (error) {
      console.error("Error creating professional:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ביצירת המטפל"
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  return {
    professionals,
    stats,
    pagination,
    loading,
    refreshing,
    error,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    setSearchTerm,
    setStatusFilter,
    setSortBy,
    setSortOrder,
    refreshData,
    loadPage,
    updateProfessional,
    navigateToEdit,
    navigateToCreate
  }
} 