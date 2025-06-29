"use client"

import { DropdownMenuItem } from "@/components/common/ui/dropdown-menu"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import { Input } from "@/components/common/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/common/ui/pagination"
import { toast } from "@/components/common/ui/use-toast"
import { deleteUserByAdmin, initiatePasswordResetByAdmin } from "@/app/dashboard/(user)/(roles)/admin/users/actions"
import {
  UserPlus,
  Users,
  Briefcase,
  Handshake,
  MoreHorizontal,
  ArrowUpDown,
  Trash2,
  KeyRound,
  Edit,
  X,
  Check,
  Filter,
} from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
// 1. Add import for UserFormDialog
import { UserFormDialog } from "./user-form-dialog"

// Add these imports for the filter component
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"

import { useQuery } from "@tanstack/react-query"

// Define UserData interface locally as requested
export interface UserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
  phone?: string | null
  roles: ("admin" | "professional" | "member" | "partner")[]
  activeRole?: string | null
  dateOfBirth?: string | null // ISO string
  gender?: "male" | "female" | "other" | null
  createdAt: string // ISO string
}

export interface RoleCounts {
  members: number
  professionals: number
  partners: number
}

// Update the UserManagementProps interface to include initialRoleFilter
interface UserManagementProps {
  initialUsers: UserData[]
  totalPages: number
  currentPage: number
  initialSearchTerm?: string
  initialRoleFilter?: string[] // Add this line back
  initialSortField: string
  initialSortDirection: "asc" | "desc"
  roleCounts: RoleCounts
}

// Helper function to calculate age (can be moved to lib/utils if used elsewhere)
const calculateAge = (dateOfBirth?: string | null): number | null => {
  if (!dateOfBirth) return null
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Helper function to format date (can be moved to lib/utils)
const formatDate = (dateString?: string | null, locale = "en-GB"): string => {
  if (!dateString) return "-"
  try {
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch (e) {
    return "-"
  }
}

// Helper function to get avatar gradient based on name
const getAvatarGradient = (name?: string | null): string => {
  if (!name) return "from-gray-400 to-gray-600"

  const gradients = [
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
    "from-indigo-400 to-indigo-600",
    "from-orange-400 to-orange-600",
    "from-teal-400 to-teal-600",
    "from-red-400 to-red-600",
  ]

  const index = name.charCodeAt(0) % gradients.length
  return gradients[index]
}

// Fix role badge styling function
const getRoleBadgeStyle = (role: "admin" | "professional" | "member" | "partner") => {
  const styles: Record<string, string> = {
    admin: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    professional: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    member: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    partner: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  }
  return styles[role] || "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
}



// In the UserManagement function parameters, uncomment initialRoleFilter
export function UserManagement({
  initialUsers,
  totalPages: initialTotalPages,
  currentPage: initialCurrentPage,
  initialSearchTerm,
  initialRoleFilter,
  initialSortField,
  initialSortDirection,
  roleCounts,
}: UserManagementProps) {
  const { t, language } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [currentPage, setCurrentPage] = useState(initialCurrentPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "")
  // Add roleFilter state back
  const [roleFilter, setRoleFilter] = useState<string[]>(initialRoleFilter || [])
  const [sortField, setSortField] = useState<string>(initialSortField)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection)

  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)

  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserData | null>(null)

  const [isLoading, setIsLoading] = useState(false) // General loading state for table actions

  // Fix role translation function
  const getRoleTranslation = (role: "admin" | "professional" | "member" | "partner") => {
    const roleKey = `roles.${role.toLowerCase()}` as const
    return t(roleKey)
  }

  // Fix gender translation function  
  const getGenderTranslation = (gender: "male" | "female" | "other") => {
    const genderKey = `gender.${gender.toLowerCase()}` as const
    return t(genderKey)
  }

  // Update URL when filters, sort, or page change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentPage > 1) params.set("page", currentPage.toString())
    else params.delete("page")

    if (searchTerm) params.set("search", searchTerm)
    else params.delete("search")

    if (roleFilter.length > 0) params.set("roles", roleFilter.join(","))
    else params.delete("roles")

    if (sortField !== "name")
      params.set("sortField", sortField) // Assuming 'name' is default
    else params.delete("sortField")

    if (sortDirection !== "asc")
      params.set("sortDirection", sortDirection) // Assuming 'asc' is default
    else params.delete("sortDirection")

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [currentPage, searchTerm, roleFilter, sortField, sortDirection, pathname, router, searchParams])

  // Effect to update local state when initial props change (e.g., after server-side filtering)
  useEffect(() => {
    setUsers(initialUsers)
    setTotalPages(initialTotalPages)
    setCurrentPage(initialCurrentPage)
    // No need to set search, sort here as they are driven by URL now
  }, [initialUsers, initialTotalPages, initialCurrentPage])

  const handleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    setSortField(field)
    setSortDirection(newDirection)
    setCurrentPage(1) // Reset to first page on sort
  }

  // Display all roles for a user
  const getRolesDisplay = (roles: ("admin" | "professional" | "member" | "partner")[]): React.ReactNode => {
    if (roles.length === 0) return <Badge variant="outline">{t("common.notApplicable")}</Badge>

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => (
          <Badge key={role} className={`${getRoleBadgeStyle(role)} transition-all duration-200 font-medium border`}>
            {getRoleTranslation(role)}
          </Badge>
        ))}
      </div>
    )
  }

  const getGenderDisplay = (gender?: "male" | "female" | "other" | null): string => {
    if (!gender) return t("common.notSet")
    return getGenderTranslation(gender)
  }

  const handleOpenCreateUserForm = () => {
    setEditingUser(null)
    setIsUserFormOpen(true)
  }

  const handleOpenEditUserForm = (user: UserData) => {
    setEditingUser(user)
    setIsUserFormOpen(true)
  }

  const handleUserFormSuccess = () => {
    // This function will be called from UserFormDialog on successful submission
    // It should trigger a re-fetch or update of the user list.
    // For now, we can force a router refresh to re-run the server component's data fetching.
    router.refresh()
    toast({
      title: t("common.success"),
      description: editingUser ? t("admin.users.userUpdatedToast") : t("admin.users.userCreatedToast"),
    })
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setIsLoading(true)
    try {
      const result = await deleteUserByAdmin(userToDelete.id)
      if (result.success) {
        toast({ title: t("common.success"), description: result.message || t("admin.users.userDeletedToast") })
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userToDelete.id)) // Optimistic update
        // Or router.refresh() for server-side refetch
      } else {
        toast({
          title: t("common.error"),
          description: result.message || t("admin.users.deleteUserErrorToast"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleChangePassword = async () => {
    if (!userForPasswordChange) return
    setIsLoading(true)
    try {
      const result = await initiatePasswordResetByAdmin(userForPasswordChange.id)
      if (result.success) {
        toast({
          title: t("common.success"),
          description: result.message || t("admin.users.passwordResetEmailSentToast"),
        })
      } else {
        toast({
          title: t("common.error"),
          description: result.message || t("admin.users.passwordResetEmailErrorToast"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("common.unexpectedError"), variant: "destructive" })
    } finally {
      setIsLoading(false)
      setIsChangePasswordDialogOpen(false)
      setUserForPasswordChange(null)
    }
  }

  // Add a function to handle role filter changes
  const handleRoleFilterChange = (role: string) => {
    setRoleFilter((current) => {
      if (current.includes(role)) {
        return current.filter((r) => r !== role)
      } else {
        return [...current, role]
      }
    })
    setCurrentPage(1) // Reset to first page on filter change
  }

  // Add a function to clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setRoleFilter([])
    setCurrentPage(1)
  }

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value)
      setCurrentPage(1) // Reset to first page on new search
    }, 500),
    [],
  )

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value)
  }

  // Debounce function
  function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise((resolve) => {
        if (timeout) {
          clearTimeout(timeout)
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor)
      })
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pageNumbers = []
    const maxPagesToShow = 5 // Example: show 5 page numbers at a time
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage > 1) setCurrentPage(currentPage - 1)
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage(1)
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <span className="px-3">...</span>
                </PaginationItem>
              )}
            </>
          )}
          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setCurrentPage(page)
                }}
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <span className="px-3">...</span>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage(totalPages)
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage < totalPages) setCurrentPage(currentPage + 1)
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  const getRoleLabel = (role: "admin" | "professional" | "member" | "partner") => {
    const roleKey = `admin.users.roles.${role}` as const
    return t(roleKey)
  }

  const getGenderLabel = (gender: "male" | "female" | "other") => {
    const genderKey = `admin.users.genders.${gender}` as const
    return t(genderKey)
  }

  return (
    <div className="space-y-6">
      {/* Statistics and Add User Button */}
      <Card>
        <CardHeader className="flex flex-col space-y-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>{t("admin.users.statisticsTitle")}</CardTitle>
            <CardDescription>{t("admin.users.statisticsDescription")}</CardDescription>
          </div>
          <Button onClick={handleOpenCreateUserForm} className="flex items-center gap-2 w-full sm:w-auto">
            <UserPlus size={18} />
            {t("admin.users.addUser")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-blue-950/20" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {t("roles.memberPlural")}
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors dark:bg-blue-900 dark:group-hover:bg-blue-800">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold group-hover:scale-105 transition-transform">{roleCounts.members}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-green-950/20" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {t("roles.professionalPlural")}
              </CardTitle>
              <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors dark:bg-green-900 dark:group-hover:bg-green-800">
                <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold group-hover:scale-105 transition-transform">
                {roleCounts.professionals}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-purple-950/20" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {t("roles.partnerPlural")}
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors dark:bg-purple-900 dark:group-hover:bg-purple-800">
                <Handshake className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold group-hover:scale-105 transition-transform">{roleCounts.partners}</div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users.userListTitle")}</CardTitle>
          {/* Replace the search input in CardHeader with: */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start">
            <div className="relative w-full sm:max-w-sm group">
              <Input
                placeholder={t("admin.users.searchPlaceholder")}
                defaultValue={searchTerm}
                onChange={handleSearchChange}
                className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => {
                    setSearchTerm("")
                    const input = document.querySelector('input[type="search"]') as HTMLInputElement
                    if (input) input.value = ""
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-primary/5 transition-all duration-200"
                >
                  <Filter className="h-4 w-4" />
                  {t("admin.users.filter")}
                  {roleFilter.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 rounded-full px-2 py-0 text-xs bg-primary/20 text-primary"
                    >
                      {roleFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("admin.users.filterByRole")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["member", "professional", "partner", "admin"].map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={roleFilter.includes(role)}
                    onCheckedChange={() => handleRoleFilterChange(role)}
                    className="transition-colors duration-200"
                  >
                    {getRoleTranslation(role as "admin" | "professional" | "member" | "partner")}
                    {roleFilter.includes(role) && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-muted transition-colors"
                    onClick={clearFilters}
                    disabled={searchTerm === "" && roleFilter.length === 0}
                  >
                    {t("admin.users.clearFilters")}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {(searchTerm || roleFilter.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("admin.users.activeFilters")}:</span>
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t("admin.users.search")}: {searchTerm}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => {
                      setSearchTerm("")
                      const input = document.querySelector('input[type="search"]') as HTMLInputElement
                      if (input) input.value = ""
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {roleFilter.map((role) => (
                <Badge key={role} variant="secondary" className="flex items-center gap-1">
                  {getRoleTranslation(role as "admin" | "professional" | "member" | "partner")}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleRoleFilterChange(role)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                {t("admin.users.clearAll")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {users.length > 0 ? (
              users.map((user) => (
                <Card
                  key={user.id}
                  className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/30 hover:border-l-primary"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {/* For mobile view, replace the Avatar component with: */}
                      <Avatar
                        className={`h-12 w-12 bg-gradient-to-br ${getAvatarGradient(user.name)} shadow-lg ring-2 ring-white dark:ring-gray-800`}
                      >
                        <AvatarFallback className="text-white font-semibold bg-transparent">
                          {user.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.name || t("common.notSet")}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email || t("common.notSet")}</p>
                        <div className="flex flex-wrap gap-1 mt-1">{getRolesDisplay(user.roles)}</div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading} className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t("admin.users.userActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEditUserForm(user)}>
                          <Edit className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setUserForPasswordChange(user)
                            setIsChangePasswordDialogOpen(true)
                          }}
                        >
                          <KeyRound className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("admin.users.changePassword")}
                        </DropdownMenuItem>
                        {session?.user?.id !== user.id && (
                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                                              <span className="font-medium">{t("admin.users.phone")}:</span> {user.phone || t("common.notSet")}
                    </div>
                    <div>
                      <span className="font-medium">{t("admin.users.gender")}:</span> {getGenderDisplay(user.gender)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">{t("admin.users.dobAndAge")}:</span>{" "}
                      {user.dateOfBirth
                        ? `${formatDate(user.dateOfBirth, language)} (${calculateAge(user.dateOfBirth)})`
                        : t("common.notSet")}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">{t("admin.users.createdDate")}:</span>{" "}
                      {formatDate(user.createdAt, language)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">{t("admin.users.noUsersFound")}</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t("admin.users.avatar")}</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="px-0 hover:bg-transparent">
                      {t("admin.users.name")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead>{t("admin.users.phone")}</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("email")} className="px-0 hover:bg-transparent">
                      {t("admin.users.email")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead>{t("admin.users.role")}</TableHead>
                  <TableHead>{t("admin.users.dobAndAge")}</TableHead>
                  <TableHead>{t("admin.users.gender")}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("createdAt")}
                      className="px-0 hover:bg-transparent"
                    >
                      {t("admin.users.createdDate")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-end">{t("admin.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group hover:bg-muted/50 transition-all duration-200 border-b border-border/50"
                    >
                      {/* For desktop view, replace the Avatar component with: */}
                      <TableCell>
                        <Avatar
                          className={`h-10 w-10 bg-gradient-to-br ${getAvatarGradient(user.name)} shadow-md ring-1 ring-white dark:ring-gray-800`}
                        >
                          <AvatarFallback className="text-white font-medium bg-transparent">
                            {user.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{user.name || t("common.notSet")}</TableCell>
                                              <TableCell>{user.phone || t("common.notSet")}</TableCell>
                      <TableCell>{user.email || t("common.notSet")}</TableCell>
                      <TableCell>{getRolesDisplay(user.roles)}</TableCell>
                      <TableCell>
                        {user.dateOfBirth
                          ? `${formatDate(user.dateOfBirth, language)} (${calculateAge(user.dateOfBirth)})`
                          : t("common.notSet")}
                      </TableCell>
                      <TableCell>{getGenderDisplay(user.gender)}</TableCell>
                      <TableCell>{formatDate(user.createdAt, language)}</TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isLoading}
                              className="opacity-60 hover:opacity-100 hover:bg-primary/10 transition-all duration-200"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                              <span className="sr-only">{t("admin.users.userActions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditUserForm(user)}>
                              <Edit className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUserForPasswordChange(user)
                                setIsChangePasswordDialogOpen(true)
                              }}
                            >
                              <KeyRound className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("admin.users.changePassword")}
                            </DropdownMenuItem>
                            {session?.user?.id !== user.id && ( // Prevent admin from deleting self
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToDelete(user)
                                  setIsDeleteDialogOpen(true)
                                }}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {t("admin.users.noUsersFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {renderPagination()}
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      <UserFormDialog
        isOpen={isUserFormOpen}
        onOpenChange={setIsUserFormOpen}
        initialData={editingUser}
        onSuccess={handleUserFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.confirmDeleteMessage")} {userToDelete?.name || t("admin.users.thisUser")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Confirmation Dialog */}
      <AlertDialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.confirmChangePasswordTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {userForPasswordChange?.email
                ? t("admin.users.confirmChangePasswordMessage") + " " + (userForPasswordChange.email || t("admin.users.thisUser"))
                : t("admin.users.confirmChangePasswordMessage") + " " + t("admin.users.thisUser")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePassword}>{t("admin.users.sendResetLink")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
