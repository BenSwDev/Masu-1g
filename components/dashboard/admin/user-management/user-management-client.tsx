"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Key, 
  UserCheck, 
  UserX,
  Crown,
  Briefcase,
  User,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { formatPhoneForDisplay } from "@/lib/phone-utils"
import { 
  type UserData, 
  type GetUsersResult, 
  type UserFilters,
  getAllUsers,
  deleteUser,
  resetUserPassword,
  toggleUserRole
} from "@/app/dashboard/(user)/(roles)/admin/users/actions"
import UserCreateDialog from "./user-create-dialog"
import UserEditDialog from "./user-edit-dialog"

interface UserManagementClientProps {
  initialData: GetUsersResult
  initialFilters: UserFilters
  stats?: any
}

export default function UserManagementClient({ 
  initialData, 
  initialFilters,
  stats 
}: UserManagementClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State
  const [users, setUsers] = useState<UserData[]>(initialData.users)
  const [totalUsers, setTotalUsers] = useState(initialData.totalUsers)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [currentPage, setCurrentPage] = useState(initialData.currentPage)
  const [filters, setFilters] = useState<UserFilters>(initialFilters)
  const [loading, setLoading] = useState(false)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null)

  // Action states
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)

  // Update URL and fetch data
  const updateFilters = async (newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    setFilters(updatedFilters)

    // Update URL
    const params = new URLSearchParams()
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, value.toString())
      }
    })
    
    router.push(`/dashboard/admin/users?${params.toString()}`)
    
    // Fetch new data
    await fetchUsers(updatedFilters)
  }

  const fetchUsers = async (searchFilters: UserFilters = filters) => {
    setLoading(true)
    try {
      const result = await getAllUsers(searchFilters)
      setUsers(result.users)
      setTotalUsers(result.totalUsers)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המשתמשים"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = async (page: number) => {
    const newFilters = { ...filters, page }
    setFilters(newFilters)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/dashboard/admin/users?${params.toString()}`)
    
    await fetchUsers(newFilters)
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    startTransition(async () => {
      try {
        const result = await deleteUser(deletingUser._id)
        if (result.success) {
          toast({
            title: "הצלחה",
            description: "המשתמש נמחק בהצלחה"
          })
          await fetchUsers()
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה",
            description: result.error || "אירעה שגיאה במחיקת המשתמש"
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "אירעה שגיאה במחיקת המשתמש"
        })
      } finally {
        setDeleteDialogOpen(false)
        setDeletingUser(null)
      }
    })
  }

  const handleResetPassword = async (userId: string) => {
    setResettingPassword(userId)
    try {
      const result = await resetUserPassword(userId)
      if (result.success) {
        toast({
          title: "הצלחה",
          description: `הסיסמה אופסה ל: ${result.data.newPassword}`
        })
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה באיפוס הסיסמה"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה באיפוס הסיסמה"
      })
    } finally {
      setResettingPassword(null)
    }
  }

  const handleToggleRole = async (userId: string, role: string) => {
    setTogglingRole(userId)
    try {
      const result = await toggleUserRole(userId, role)
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "התפקיד עודכן בהצלחה"
        })
        await fetchUsers()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה בעדכון התפקיד"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון התפקיד"
      })
    } finally {
      setTogglingRole(null)
    }
  }

  const getRoleBadge = (roles: string[]) => {
    const roleConfig = {
      admin: { label: "מנהל", variant: "destructive" as const, icon: Crown },
      professional: { label: "מטפל", variant: "default" as const, icon: Briefcase },
      member: { label: "חבר", variant: "secondary" as const, icon: User },
      partner: { label: "שותף", variant: "outline" as const, icon: Shield }
    }

    return roles.map(role => {
      const config = roleConfig[role as keyof typeof roleConfig]
      if (!config) return null
      
      const Icon = config.icon
      return (
        <Badge key={role} variant={config.variant} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
      )
    }).filter(Boolean)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>רשימת משתמשים</CardTitle>
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              משתמש חדש
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, מייל או טלפון..."
                value={filters.search || ""}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select
              value={filters.role || ""}
              onValueChange={(value) => updateFilters({ role: value || undefined })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סנן לפי תפקיד" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל התפקידים</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="professional">מטפל</SelectItem>
                <SelectItem value="member">חבר</SelectItem>
                <SelectItem value="partner">שותף</SelectItem>
              </SelectContent>
            </Select>

            {/* Gender Filter */}
            <Select
              value={filters.gender || ""}
              onValueChange={(value) => updateFilters({ gender: value || undefined })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סנן לפי מגדר" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">כל המגדרים</SelectItem>
                <SelectItem value="male">זכר</SelectItem>
                <SelectItem value="female">נקבה</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>משתמש</TableHead>
                  <TableHead>פרטי קשר</TableHead>
                  <TableHead>תפקידים</TableHead>
                  <TableHead>אימותים</TableHead>
                  <TableHead>תאריך הצטרפות</TableHead>
                  <TableHead className="w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="animate-pulse h-12 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      לא נמצאו משתמשים
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.gender === "male" ? "זכר" : user.gender === "female" ? "נקבה" : "אחר"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{formatPhoneForDisplay(user.phone)}</div>
                          {user.email && (
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getRoleBadge(user.roles)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.emailVerified ? (
                            <Badge variant="default" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              מייל
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <UserX className="w-3 h-3 mr-1" />
                              מייל
                            </Badge>
                          )}
                          {user.phoneVerified ? (
                            <Badge variant="default" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              טלפון
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <UserX className="w-3 h-3 mr-1" />
                              טלפון
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(user.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingUser(user)
                                setEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user._id)}
                              disabled={resettingPassword === user._id}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              {resettingPassword === user._id ? "מאפס..." : "איפוס סיסמה"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!user.roles.includes("admin") && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingUser(user)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                מחיקה
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                מציג {((currentPage - 1) * (filters.limit || 20)) + 1} עד {Math.min(currentPage * (filters.limit || 20), totalUsers)} מתוך {totalUsers} משתמשים
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                  הקודם
                </Button>
                <span className="text-sm font-medium">
                  עמוד {currentPage} מתוך {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <UserCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
          fetchUsers()
        }}
      />

      {/* Edit User Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={editingUser}
        onSuccess={() => {
          setEditDialogOpen(false)
          setEditingUser(null)
          fetchUsers()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המשתמש {deletingUser?.name} לצמיתות.
              לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 
