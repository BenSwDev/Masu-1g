"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { Badge } from "@/components/common/ui/badge"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { makeUserAdmin, removeAdminRole, updateUserRoles } from "@/actions/admin-actions"
import { toast } from "@/components/common/ui/use-toast"
import { Shield, ShieldCheck, User, Briefcase, Handshake } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Pagination, PaginationContent, PaginationItem } from "@/components/common/ui/pagination"
import { ArrowUpDown } from "lucide-react"

interface UserData {
  id: string
  name: string
  email: string
  phone?: string
  roles: string[]
  createdAt: string
}

interface UserManagementProps {
  users: UserData[]
  totalPages: number
  currentPage: number
  searchTerm?: string
  roleFilter?: string[]
  sortField: string
  sortDirection: "asc" | "desc"
}

export function UserManagement({
  users: initialUsers,
  totalPages: initialTotalPages,
  currentPage: initialPage,
  searchTerm: initialSearchTerm,
  roleFilter: initialRoleFilter,
  sortField: initialSortField,
  sortDirection: initialSortDirection,
}: UserManagementProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "")
  const [roleFilter, setRoleFilter] = useState<string[]>(initialRoleFilter || [])
  const [sortField, setSortField] = useState<string>(initialSortField)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection)
  const [localUsers, setLocalUsers] = useState<UserData[]>(initialUsers)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const itemsPerPage = 10

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) params.set("page", currentPage.toString())
    if (searchTerm) params.set("search", searchTerm)
    if (roleFilter.length > 0) params.set("roles", roleFilter.join(","))
    if (sortField !== "name") params.set("sortField", sortField)
    if (sortDirection !== "asc") params.set("sortDirection", sortDirection)

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    window.history.pushState({}, "", newUrl)
  }, [currentPage, searchTerm, roleFilter, sortField, sortDirection])

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...localUsers]

    // Apply search
    if (searchTerm) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply role filter
    if (roleFilter.length > 0) {
      result = result.filter((user) => roleFilter.some((role) => user.roles.includes(role)))
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField as keyof UserData]
      const bValue = b[sortField as keyof UserData]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      return 0
    })

    return result
  }, [localUsers, searchTerm, roleFilter, sortField, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />
      case "professional":
        return <Briefcase className="h-4 w-4" />
      case "partner":
        return <Handshake className="h-4 w-4" />
      case "member":
        return <User className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  // Get role color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "professional":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "partner":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "member":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Handle making a user admin
  const handleMakeAdmin = async (userId: string) => {
    setIsLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      const result = await makeUserAdmin(userId)
      if (result.success) {
        // Update local state
        setLocalUsers((prev) =>
          prev.map((user) => {
            if (user.id === userId && !user.roles.includes("admin")) {
              return { ...user, roles: [...user.roles, "admin"] }
            }
            return user
          }),
        )
        toast({
          title: "Success",
          description: "User is now an admin",
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to make user admin",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  // Handle removing admin role
  const handleRemoveAdmin = async (userId: string) => {
    setIsLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      const result = await removeAdminRole(userId)
      if (result.success) {
        // Update local state
        setLocalUsers((prev) =>
          prev.map((user) => {
            if (user.id === userId) {
              return { ...user, roles: user.roles.filter((role) => role !== "admin") }
            }
            return user
          }),
        )
        toast({
          title: "Success",
          description: "Admin role removed from user",
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to remove admin role",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  // Open edit roles dialog
  const openEditRolesDialog = (user: UserData) => {
    setSelectedUser(user)
    const roles: Record<string, boolean> = {}
    user.roles.forEach((role) => {
      roles[role] = true
    })
    setSelectedRoles(roles)
    setIsDialogOpen(true)
  }

  // Handle role checkbox change
  const handleRoleChange = (role: string, checked: boolean) => {
    setSelectedRoles((prev) => ({ ...prev, [role]: checked }))
  }

  // Save user roles
  const saveUserRoles = async () => {
    if (!selectedUser) return

    const newRoles = Object.entries(selectedRoles)
      .filter(([_, isSelected]) => isSelected)
      .map(([role]) => role)

    // Ensure user has at least one role
    if (newRoles.length === 0) {
      toast({
        title: "Error",
        description: "User must have at least one role",
        variant: "destructive",
      })
      return
    }

    setIsLoading((prev) => ({ ...prev, [selectedUser.id]: true }))
    try {
      const result = await updateUserRoles(selectedUser.id, newRoles)
      if (result.success) {
        // Update local state
        setLocalUsers((prev) =>
          prev.map((user) => {
            if (user.id === selectedUser.id) {
              return { ...user, roles: newRoles }
            }
            return user
          }),
        )
        toast({
          title: "Success",
          description: "User roles updated successfully",
          variant: "default",
        })
        setIsDialogOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update user roles",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, [selectedUser.id]: false }))
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Search and Filters */}
        <div className="mb-4 flex gap-4">
          <Input
            placeholder={t("admin.users.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={roleFilter.join(",")}
            onValueChange={(value) => setRoleFilter(value === "all" ? [] : value.split(","))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.users.filterByRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
              <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              <SelectItem value="professional">{t("roles.professional")}</SelectItem>
              <SelectItem value="partner">{t("roles.partner")}</SelectItem>
              <SelectItem value="member">{t("roles.member")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 flex-row-reverse"
                >
                  {t("admin.users.name")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("email")}
                  className="flex items-center gap-1 flex-row-reverse"
                >
                  {t("admin.users.email")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>{t("admin.users.roles")}</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center gap-1 flex-row-reverse"
                >
                  {t("admin.users.created")}
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>{t("admin.users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline" className={getRoleBadgeColor(role)}>
                        <span className="flex items-center gap-1 flex-row-reverse">
                          {getRoleIcon(role)}
                          {role}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-row-reverse">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditRolesDialog(user)}
                      disabled={isLoading[user.id]}
                    >
                      Edit Roles
                    </Button>
                    {!user.roles.includes("admin") ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMakeAdmin(user.id)}
                        disabled={isLoading[user.id]}
                      >
                        Make Admin
                      </Button>
                    ) : user.id !== session?.user?.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAdmin(user.id)}
                        disabled={isLoading[user.id]}
                      >
                        Remove Admin
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("common.previous")}
                  </Button>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("common.next")}
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Edit Roles Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Roles</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="role-admin"
                    checked={selectedRoles["admin"] || false}
                    onCheckedChange={(checked) => handleRoleChange("admin", checked === true)}
                  />
                  <label htmlFor="role-admin" className="flex items-center gap-2 text-sm font-medium flex-row-reverse">
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="role-professional"
                    checked={selectedRoles["professional"] || false}
                    onCheckedChange={(checked) => handleRoleChange("professional", checked === true)}
                  />
                  <label
                    htmlFor="role-professional"
                    className="flex items-center gap-2 text-sm font-medium flex-row-reverse"
                  >
                    <Briefcase className="h-4 w-4" />
                    Professional
                  </label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="role-partner"
                    checked={selectedRoles["partner"] || false}
                    onCheckedChange={(checked) => handleRoleChange("partner", checked === true)}
                  />
                  <label
                    htmlFor="role-partner"
                    className="flex items-center gap-2 text-sm font-medium flex-row-reverse"
                  >
                    <Handshake className="h-4 w-4" />
                    Partner
                  </label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="role-member"
                    checked={selectedRoles["member"] || false}
                    onCheckedChange={(checked) => handleRoleChange("member", checked === true)}
                  />
                  <label htmlFor="role-member" className="flex items-center gap-2 text-sm font-medium flex-row-reverse">
                    <User className="h-4 w-4" />
                    Member
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 flex-row-reverse">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveUserRoles} disabled={isLoading[selectedUser?.id || ""]}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
