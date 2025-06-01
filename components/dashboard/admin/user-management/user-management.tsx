"use client"

import { cn } from "@/lib/utils"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/common/ui/dropdown-menu"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/common/ui/pagination"
import { toast } from "@/components/common/ui/use-toast"
import { deleteUserByAdmin, initiatePasswordResetByAdmin } from "@/actions/admin-actions"
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
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Mail,
  Phone,
} from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { UserFormDialog } from "./user-form-dialog"

// Define UserData interface locally as requested
export interface UserData {
  id: string
  name: string | null
  email: string | null
  image?: string | null
  phone?: string | null
  roles: string[]
  activeRole?: string | null
  dateOfBirth?: string | null // ISO string
  gender?: string | null
  createdAt: string // ISO string
}

export interface RoleCounts {
  members: number
  professionals: number
  partners: number
}

interface UserManagementProps {
  initialUsers: UserData[]
  totalPages: number
  currentPage: number
  initialSearchTerm?: string
  initialRoleFilter?: string[]
  initialSortField: string
  initialSortDirection: "asc" | "desc"
  roleCounts: RoleCounts
}

// Helper function to calculate age
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

// Helper function to format date
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

// Helper function to get user initials with enhanced styling
const getUserInitials = (name: string | null | undefined, email: string | null | undefined) => {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return "U"
}

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
  const [roleFilter, setRoleFilter] = useState<string[]>(initialRoleFilter || [])
  const [sortField, setSortField] = useState<string>(initialSortField)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection)

  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null)

  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserData | null>(null)

  const [isLoading, setIsLoading] = useState(false)

  // Update URL when filters, sort, or page change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentPage > 1) params.set("page", currentPage.toString())
    else params.delete("page")

    if (searchTerm) params.set("search", searchTerm)
    else params.delete("search")

    if (roleFilter.length > 0) params.set("roles", roleFilter.join(","))
    else params.delete("roles")

    if (sortField !== "name") params.set("sortField", sortField)
    else params.delete("sortField")

    if (sortDirection !== "asc") params.set("sortDirection", sortDirection)
    else params.delete("sortDirection")

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [currentPage, searchTerm, roleFilter, sortField, sortDirection, pathname, router, searchParams])

  // Effect to update local state when initial props change
  useEffect(() => {
    setUsers(initialUsers)
    setTotalPages(initialTotalPages)
    setCurrentPage(initialCurrentPage)
  }, [initialUsers, initialTotalPages, initialCurrentPage])

  const handleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    setSortField(field)
    setSortDirection(newDirection)
    setCurrentPage(1)
  }

  // Enhanced role display with colors
  const getRolesDisplay = (roles: string[]): React.ReactNode => {
    if (roles.length === 0) return <Badge variant="outline">{t("common.notApplicable")}</Badge>

    const roleColors = {
      member: "bg-emerald-100 text-emerald-800 border-emerald-200",
      professional: "bg-blue-100 text-blue-800 border-blue-200",
      partner: "bg-purple-100 text-purple-800 border-purple-200",
      admin: "bg-orange-100 text-orange-800 border-orange-200",
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => (
          <Badge
            key={role}
            variant="outline"
            className={cn("text-xs font-medium", roleColors[role as keyof typeof roleColors])}
          >
            {t(`roles.${role.toLowerCase()}`, role)}
          </Badge>
        ))}
      </div>
    )
  }

  const getGenderDisplay = (gender?: string | null): string => {
    if (!gender) return t("common.notSet")
    return t(`gender.${gender.toLowerCase()}`, gender)
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
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userToDelete.id))
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

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value)
      setCurrentPage(1)
    }, 500),
    [],
  )

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(event.target.value)
  }

  const handleRoleFilterChange = (role: string) => {
    const newRoleFilter = roleFilter.includes(role) ? roleFilter.filter((r) => r !== role) : [...roleFilter, role]
    setRoleFilter(newRoleFilter)
    setCurrentPage(1)
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
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (currentPage > 1) setCurrentPage(currentPage - 1)
              }}
              className={cn(
                "transition-all duration-200",
                currentPage === 1 ? "pointer-events-none opacity-50" : "hover:bg-turquoise-50 hover:text-turquoise-700",
              )}
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
                  className="hover:bg-turquoise-50 hover:text-turquoise-700"
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
                className={cn(
                  "transition-all duration-200",
                  currentPage === page
                    ? "bg-turquoise-500 text-white hover:bg-turquoise-600"
                    : "hover:bg-turquoise-50 hover:text-turquoise-700",
                )}
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
                  className="hover:bg-turquoise-50 hover:text-turquoise-700"
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
              className={cn(
                "transition-all duration-200",
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-turquoise-50 hover:text-turquoise-700",
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen p-6">
      {/* Enhanced Statistics Cards */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50/50">
        <CardHeader className="flex flex-col space-y-4 pb-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {t("admin.users.statisticsTitle")}
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">{t("admin.users.statisticsDescription")}</CardDescription>
          </div>
          <Button
            onClick={handleOpenCreateUserForm}
            className="flex items-center gap-2 w-full sm:w-auto bg-gradient-to-r from-turquoise-500 to-cyan-500 hover:from-turquoise-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <UserPlus size={18} />
            {t("admin.users.addUser")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-800">
                {t("roles.memberPlural", "Members")}
              </CardTitle>
              <div className="p-2 bg-emerald-200 rounded-lg">
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-800">{roleCounts.members}</div>
              <p className="text-xs text-emerald-600 mt-1">Active members</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-800">
                {t("roles.professionalPlural", "Professionals")}
              </CardTitle>
              <div className="p-2 bg-blue-200 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">{roleCounts.professionals}</div>
              <p className="text-xs text-blue-600 mt-1">Verified professionals</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800">
                {t("roles.partnerPlural", "Partners")}
              </CardTitle>
              <div className="p-2 bg-purple-200 rounded-lg">
                <Handshake className="h-5 w-5 text-purple-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-800">{roleCounts.partners}</div>
              <p className="text-xs text-purple-600 mt-1">Business partners</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Enhanced User Table */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50/50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200">
          <CardTitle className="text-xl font-bold text-slate-800">{t("admin.users.userListTitle")}</CardTitle>

          {/* Enhanced Filters */}
          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder={t("admin.users.searchPlaceholder")}
                  defaultValue={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 border-slate-200 focus:border-turquoise-400 focus:ring-turquoise-400/20 bg-white"
                />
              </div>

              {/* Sort Field Select */}
              <Select
                value={sortField}
                onValueChange={(value) => {
                  setSortField(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48 border-slate-200 focus:border-turquoise-400 bg-white">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t("admin.users.name")}
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("admin.users.email")}
                    </div>
                  </SelectItem>
                  <SelectItem value="createdAt">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("admin.users.createdDate")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Direction Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                  setCurrentPage(1)
                }}
                className="border-slate-200 hover:bg-turquoise-50 hover:border-turquoise-300"
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by role:
              </span>
              {["member", "professional", "partner", "admin"].map((role) => {
                const isActive = roleFilter.includes(role)
                const roleColors = {
                  member: isActive
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                  professional: isActive ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200",
                  partner: isActive ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-700 hover:bg-purple-200",
                  admin: isActive ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200",
                }

                return (
                  <Button
                    key={role}
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoleFilterChange(role)}
                    className={cn("border-0 transition-all duration-200", roleColors[role as keyof typeof roleColors])}
                  >
                    {t(`roles.${role.toLowerCase()}`, role)}
                  </Button>
                )
              })}
              {roleFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleFilter([])
                    setCurrentPage(1)
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4 p-6">
            {users.length > 0 ? (
              users.map((user) => (
                <Card
                  key={user.id}
                  className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-slate-50/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-14 w-14 ring-2 ring-turquoise-200 shadow-md">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User Avatar"} />
                        <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-bold text-sm">
                          {getUserInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{user.name || t("common.notSet")}</p>
                        <p className="text-sm text-slate-600 truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email || t("common.notSet")}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">{getRolesDisplay(user.roles)}</div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isLoading}
                          className="h-8 w-8 hover:bg-turquoise-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t("admin.users.userActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-slate-600">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenEditUserForm(user)}
                          className="hover:bg-turquoise-50"
                        >
                          <Edit className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setUserForPasswordChange(user)
                            setIsChangePasswordDialogOpen(true)
                          }}
                          className="hover:bg-blue-50"
                        >
                          <KeyRound className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("admin.users.changePassword")}
                        </DropdownMenuItem>
                        {session?.user?.id !== user.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToDelete(user)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3 w-3" />
                      <span className="font-medium">Phone:</span> {user.phone || t("common.notSet")}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="font-medium">Gender:</span> {getGenderDisplay(user.gender)}
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">Born:</span>{" "}
                      {user.dateOfBirth
                        ? `${formatDate(user.dateOfBirth, language)} (${calculateAge(user.dateOfBirth)})`
                        : t("common.notSet")}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                {t("admin.users.noUsersFound")}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50">
                  <TableHead className="w-[80px] font-semibold text-slate-700">{t("admin.users.avatar")}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("name")}
                      className="px-0 hover:bg-transparent font-semibold text-slate-700"
                    >
                      {t("admin.users.name")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">{t("admin.users.phone")}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("email")}
                      className="px-0 hover:bg-transparent font-semibold text-slate-700"
                    >
                      {t("admin.users.email")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">{t("admin.users.role")}</TableHead>
                  <TableHead className="font-semibold text-slate-700">{t("admin.users.dobAndAge")}</TableHead>
                  <TableHead className="font-semibold text-slate-700">{t("admin.users.gender")}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("createdAt")}
                      className="px-0 hover:bg-transparent font-semibold text-slate-700"
                    >
                      {t("admin.users.createdDate")} <ArrowUpDown className="ms-2 h-4 w-4 rtl:me-2 rtl:ms-0" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-end font-semibold text-slate-700">{t("admin.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "hover:bg-gradient-to-r hover:from-turquoise-50/30 hover:to-blue-50/30 transition-all duration-200",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                      )}
                    >
                      <TableCell>
                        <Avatar className="h-12 w-12 ring-2 ring-turquoise-200 shadow-sm">
                          <AvatarImage src={user.image || undefined} alt={user.name || "User Avatar"} />
                          <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-bold">
                            {getUserInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">{user.name || t("common.notSet")}</TableCell>
                      <TableCell className="text-slate-600">{user.phone || t("common.notSet")}</TableCell>
                      <TableCell className="text-slate-600">{user.email || t("common.notSet")}</TableCell>
                      <TableCell>{getRolesDisplay(user.roles)}</TableCell>
                      <TableCell className="text-slate-600">
                        {user.dateOfBirth
                          ? `${formatDate(user.dateOfBirth, language)} (${calculateAge(user.dateOfBirth)})`
                          : t("common.notSet")}
                      </TableCell>
                      <TableCell className="text-slate-600">{getGenderDisplay(user.gender)}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(user.createdAt, language)}</TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isLoading} className="hover:bg-turquoise-50">
                              <MoreHorizontal className="h-5 w-5" />
                              <span className="sr-only">{t("admin.users.userActions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-slate-600">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenEditUserForm(user)}
                              className="hover:bg-turquoise-50"
                            >
                              <Edit className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUserForPasswordChange(user)
                                setIsChangePasswordDialogOpen(true)
                              }}
                              className="hover:bg-blue-50"
                            >
                              <KeyRound className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("admin.users.changePassword")}
                            </DropdownMenuItem>
                            {session?.user?.id !== user.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setUserToDelete(user)
                                    setIsDeleteDialogOpen(true)
                                  }}
                                  className="text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" /> {t("common.delete")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Users className="h-12 w-12 mb-4 text-slate-300" />
                        {t("admin.users.noUsersFound")}
                      </div>
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
        <AlertDialogContent className="bg-gradient-to-br from-white to-red-50/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-800">{t("admin.users.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {t("admin.users.confirmDeleteMessage", { userName: userToDelete?.name || t("admin.users.thisUser") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 hover:bg-slate-50">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Confirmation Dialog */}
      <AlertDialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-white to-blue-50/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-blue-800">{t("admin.users.confirmChangePasswordTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {userForPasswordChange?.email
                ? t("admin.users.confirmChangePasswordMessage", { userEmail: userForPasswordChange.email })
                : t("admin.users.confirmChangePasswordMessage", { userEmail: t("admin.users.thisUser") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 hover:bg-slate-50">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangePassword}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              {t("admin.users.sendResetLink")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
