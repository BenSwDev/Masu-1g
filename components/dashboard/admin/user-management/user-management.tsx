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
import { Shield, ShieldCheck, User, Briefcase, Handshake, PlusCircle, Edit, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Pagination, PaginationContent, PaginationItem } from "@/components/common/ui/pagination"
import { ArrowUpDown } from "lucide-react"
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
import { UserForm, type UserFormValues, type EditUserFormValues } from "./user-form"
import { createUserByAdmin, updateUserByAdmin, deleteUserByAdmin, adminSetUserPassword } from "@/actions/admin-actions" // Make sure paths are correct
import { useRouter } from "next/navigation" // For router.refresh()
import { cn } from "@/lib/utils"

interface UserData {
  id: string
  name: string
  email: string
  phone?: string
  roles: string[]
  createdAt: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: string // Store as ISO string from server
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
  const router = useRouter() // For refreshing data

  // States for modals and selected user
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null) // For edit/delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Keep existing states: isLoading, currentPage, searchTerm, etc.
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState(false) // For specific actions like save/delete
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

  // Update localUsers when initialUsers prop changes (e.g., after navigation or refresh)
  useEffect(() => {
    setLocalUsers(initialUsers)
  }, [initialUsers])

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

  const handleOpenAddUserModal = () => {
    setCurrentUser(null)
    setIsEditingUser(false)
    setIsUserFormOpen(true)
  }

  const handleOpenEditUserModal = (user: UserData) => {
    setCurrentUser(user)
    setIsEditingUser(true)
    setIsUserFormOpen(true)
  }

  const handleOpenDeleteDialog = (user: UserData) => {
    setCurrentUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleUserFormSubmit = async (values: UserFormValues | EditUserFormValues, password?: string) => {
    setActionLoading(true)
    try {
      let result
      if (isEditingUser && currentUser) {
        result = await updateUserByAdmin(currentUser.id, values as EditUserFormValues)
        if (result.success && password) {
          const passwordResult = await adminSetUserPassword(currentUser.id, password)
          if (!passwordResult.success) {
            toast({
              title: t("admin.users.error"),
              description: t(passwordResult.message || "errors.passwordSetFailed"),
              variant: "destructive",
            })
            // Potentially don't close modal or revert if main update succeeded but password failed
          }
        }
      } else {
        result = await createUserByAdmin(values as UserFormValues)
      }

      if (result.success) {
        toast({ title: t("admin.users.success"), description: t(result.message), variant: "default" })
        setIsUserFormOpen(false)
        router.refresh() // Re-fetch data from server
      } else {
        toast({
          title: t("admin.users.error"),
          description: t(result.message || (isEditingUser ? "errors.updateFailed" : "errors.creationFailed")),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("admin.users.error"), description: t("errors.unexpectedError"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!currentUser) return
    setActionLoading(true)
    try {
      const result = await deleteUserByAdmin(currentUser.id)
      if (result.success) {
        toast({ title: t("admin.users.success"), description: t(result.message), variant: "default" })
        setIsDeleteDialogOpen(false)
        router.refresh() // Re-fetch data from server
      } else {
        toast({
          title: t("admin.users.error"),
          description: t(result.message || "errors.deleteFailed"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("admin.users.error"), description: t("errors.unexpectedError"), variant: "destructive" })
    } finally {
      setActionLoading(false)
      setCurrentUser(null)
    }
  }

  // Handle making a user admin
  const handleMakeAdmin = async (userId: string) => {
    setIsLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      const result = await makeUserAdmin(userId)
      if (result.success) {
        toast({
          title: "Success",
          description: "User is now an admin",
          variant: "default",
        })
        router.refresh()
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
        toast({
          title: "Success",
          description: "Admin role removed from user",
          variant: "default",
        })
        router.refresh()
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
        toast({
          title: "Success",
          description: "User roles updated successfully",
          variant: "default",
        })
        setIsDialogOpen(false)
        router.refresh()
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
        <div className="flex justify-between items-center mb-4">
          {/* Search and Filters */}
          <div className="flex gap-2 flex-wrap">
            {" "}
            {/* Changed to gap-2 and flex-wrap */}
            <Input
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-10" // Adjusted width and height
            />
            <Select
              value={roleFilter.join(",")}
              onValueChange={(value) => setRoleFilter(value === "all" ? [] : value.split(","))}
            >
              <SelectTrigger className="w-[180px] h-10">
                {" "}
                {/* Adjusted width and height */}
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
          <Button onClick={handleOpenAddUserModal} className="bg-turquoise-600 hover:bg-turquoise-700 text-white h-10">
            <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> {t("admin.users.addUser")}
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* ... (keep existing TableHeads for Name, Email, Roles, Created) ... */}
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("name")} className="flex items-center gap-1 px-1">
                    {t("admin.users.name")} <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort("email")} className="flex items-center gap-1 px-1">
                    {t("admin.users.email")} <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>{t("admin.users.roles")}</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center gap-1 px-1"
                  >
                    {t("admin.users.created")} <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right rtl:text-left">{t("admin.users.actions")}</TableHead>
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
                        <Badge
                          key={role}
                          variant="outline"
                          className={cn(getRoleBadgeColor(role), "text-xs px-1.5 py-0.5")}
                        >
                          <span className="flex items-center gap-1">
                            {getRoleIcon(role)}
                            {t(`roles.${role.toLowerCase()}`, role)}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right rtl:text-left">
                    <div className="flex gap-2 justify-end rtl:justify-start">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditRolesDialog(user)}
                        disabled={isLoading[user.id] || actionLoading}
                        className="h-8 w-8 border-gray-300 hover:bg-gray-100"
                        title={t("admin.users.editRoles")}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenEditUserModal(user)}
                        disabled={actionLoading}
                        className="h-8 w-8 border-blue-300 hover:bg-blue-50 text-blue-600"
                        title={t("admin.users.editUser")}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.id !== session?.user?.id && ( // Prevent deleting self
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDeleteDialog(user)}
                          disabled={actionLoading}
                          className="h-8 w-8 border-red-300 hover:bg-red-50 text-red-600"
                          title={t("admin.users.deleteUser")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {/* ... (keep existing Pagination, ensure it uses initialTotalPages from props) ... */}
        {initialTotalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || actionLoading}
                  >
                    {t("common.previous")}
                  </Button>
                </PaginationItem>
                {Array.from({ length: initialTotalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={actionLoading}
                      className={currentPage === page ? "bg-turquoise-600 hover:bg-turquoise-700" : ""}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(initialTotalPages, p + 1))}
                    disabled={currentPage === initialTotalPages || actionLoading}
                  >
                    {t("common.next")}
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Edit Roles Dialog (keep existing) */}
        {/* ... (Dialog for editing roles, ensure it uses actionLoading for its save button) ... */}
        {/* In the "Save" button of Edit Roles Dialog: disabled={isLoading[selectedUser?.id || ""] || actionLoading} */}
        {/* And after successful role update in saveUserRoles: router.refresh(); */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Roles</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-admin"
                    checked={selectedRoles["admin"] || false}
                    onCheckedChange={(checked) => handleRoleChange("admin", checked === true)}
                  />
                  <label htmlFor="role-admin" className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-professional"
                    checked={selectedRoles["professional"] || false}
                    onCheckedChange={(checked) => handleRoleChange("professional", checked === true)}
                  />
                  <label htmlFor="role-professional" className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase className="h-4 w-4" />
                    Professional
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-partner"
                    checked={selectedRoles["partner"] || false}
                    onCheckedChange={(checked) => handleRoleChange("partner", checked === true)}
                  />
                  <label htmlFor="role-partner" className="flex items-center gap-2 text-sm font-medium">
                    <Handshake className="h-4 w-4" />
                    Partner
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-member"
                    checked={selectedRoles["member"] || false}
                    onCheckedChange={(checked) => handleRoleChange("member", checked === true)}
                  />
                  <label htmlFor="role-member" className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Member
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveUserRoles} disabled={isLoading[selectedUser?.id || ""] || actionLoading}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit User Dialog */}
        <Dialog
          open={isUserFormOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setIsUserFormOpen(false)
          }}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6 bg-white rounded-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-turquoise-800">
                {isEditingUser ? t("admin.users.editUserTitle") : t("admin.users.addUserTitle")}
              </DialogTitle>
            </DialogHeader>
            <UserForm
              user={
                currentUser
                  ? {
                      ...currentUser,
                      dateOfBirth: currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth) : undefined,
                    }
                  : undefined
              }
              onSubmit={handleUserFormSubmit}
              onCancel={() => setIsUserFormOpen(false)}
              isLoading={actionLoading}
              isEditing={isEditingUser}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-white rounded-lg shadow-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-red-700">
                {t("admin.users.deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                {t("admin.users.deleteConfirmDescription", {
                  userName: currentUser?.name || t("admin.users.thisUser"),
                })}
                <br />
                {t("admin.users.deleteConfirmWarning")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel
                onClick={() => setCurrentUser(null)}
                disabled={actionLoading}
                className="hover:bg-gray-100"
              >
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
