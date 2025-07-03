"use client"

import { useState, useTransition, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Badge } from "@/components/common/ui/badge"
import { useToast } from "@/components/common/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/common/ui/tooltip"
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
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Settings,
  Mail,
  Phone,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { 
  type UserData, 
  type GetUsersResult, 
  type UserFilters,
  getAllUsers,
  deleteUser,
  resetUserPassword,
  toggleUserRole,
  toggleUserStatus
} from "@/app/dashboard/(user)/(roles)/admin/users/actions"
import UserCreateDialog from "./user-create-dialog"
import UserEditDialog from "./user-edit-dialog"

interface UserManagementClientProps {
  initialData: GetUsersResult
  initialFilters: UserFilters
}

export default function UserManagementClient({ 
  initialData, 
  initialFilters
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
  const [hasNextPage, setHasNextPage] = useState(initialData.hasNextPage)
  const [hasPrevPage, setHasPrevPage] = useState(initialData.hasPrevPage)
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
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)

  // Memoized values
  const displayUsers = useMemo(() => {
    return users.filter(user => user.isActive !== false || filters.isActive === false)
  }, [users, filters.isActive])

  // Update URL and fetch data
  const updateFilters = useCallback(async (newFilters: Partial<UserFilters>) => {
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
  }, [filters, router])

  const fetchUsers = useCallback(async (searchFilters: UserFilters = filters) => {
    if (loading) return
    
    setLoading(true)
    try {
      const result = await getAllUsers(searchFilters)
      setUsers(result.users)
      setTotalUsers(result.totalUsers)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
      setHasNextPage(result.hasNextPage)
      setHasPrevPage(result.hasPrevPage)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת המשתמשים"
      })
    } finally {
      setLoading(false)
    }
  }, [filters, loading, toast])

  const handlePageChange = useCallback(async (page: number) => {
    const newFilters = { ...filters, page }
    setFilters(newFilters)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/dashboard/admin/users?${params.toString()}`)
    
    await fetchUsers(newFilters)
  }, [filters, searchParams, router, fetchUsers])

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    startTransition(async () => {
      try {
        const result = await deleteUser(deletingUser._id)
        if (result.success) {
          toast({
            title: "הצלחה",
            description: "המשתמש הוסתר בהצלחה"
          })
          await fetchUsers()
        } else {
          toast({
            variant: "destructive",
            title: "שגיאה",
            description: result.error || "אירעה שגיאה בהסתרת המשתמש"
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "אירעה שגיאה בהסתרת המשתמש"
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
          description: `הסיסמה אופסה ל: ${result.data.newPassword}`,
          duration: 10000
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

  const handleToggleUserStatus = async (userId: string) => {
    setTogglingStatus(userId)
    try {
      const result = await toggleUserStatus(userId)
      if (result.success) {
        toast({
          title: "הצלחה",
          description: result.data.isActive ? "המשתמש הופעל בהצלחה" : "המשתמש בוטל בהצלחה"
        })
        await fetchUsers()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה בשינוי סטטוס המשתמש"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בשינוי סטטוס המשתמש"
      })
    } finally {
      setTogglingStatus(null)
    }
  }

  const handleToggleRole = async (userId: string, role: string) => {
    setTogglingRole(userId)
    try {
      const result = await toggleUserRole(userId, role)
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "תפקיד המשתמש עודכן בהצלחה"
        })
        await fetchUsers()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "אירעה שגיאה בעדכון תפקיד המשתמש"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אירעה שגיאה בעדכון תפקיד המשתמש"
      })
    } finally {
      setTogglingRole(null)
    }
  }

  const getRoleBadge = (roles: string[]) => {
    return roles.map(role => {
      const roleConfig = {
        admin: { label: "מנהל", icon: Crown, variant: "default" as const, color: "bg-amber-100 text-amber-800 border-amber-200" },
        professional: { label: "מטפל", icon: Briefcase, variant: "secondary" as const, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
        member: { label: "חבר", icon: User, variant: "outline" as const, color: "bg-blue-100 text-blue-800 border-blue-200" },
        partner: { label: "שותף", icon: Shield, variant: "outline" as const, color: "bg-indigo-100 text-indigo-800 border-indigo-200" }
      }
      
      const config = roleConfig[role as keyof typeof roleConfig]
      if (!config) return null
      
      const Icon = config.icon
      
      return (
        <Badge key={role} className={`text-xs ${config.color} hover:opacity-80`}>
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      )
    }).filter(Boolean)
  }

  const getStatusBadge = (user: UserData) => {
    const isActive = user.isActive !== false
    
    if (isActive) {
      return (
        <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          פעיל
        </Badge>
      )
    } else {
      return (
        <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          לא פעיל
        </Badge>
      )
    }
  }

  const getVerificationBadges = (user: UserData) => {
    return (
      <div className="flex gap-1">
        {user.emailVerified ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <Mail className="w-3 h-3 mr-1" />
            מייל ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
            <Mail className="w-3 h-3 mr-1" />
            מייל
          </Badge>
        )}
        {user.phoneVerified ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <Phone className="w-3 h-3 mr-1" />
            טלפון ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
            <Phone className="w-3 h-3 mr-1" />
            טלפון
          </Badge>
        )}
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const clearFilters = () => {
    updateFilters({
      search: "",
      role: "all",
      gender: "all",
      emailVerified: undefined,
      phoneVerified: undefined,
      isActive: undefined
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  רשימת משתמשים
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  מציג {displayUsers.length} מתוך {totalUsers} משתמשים
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchUsers()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  ייצא
                </Button>
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  משתמש חדש
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
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

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Role Filter */}
                <Select
                  value={filters.role || "all"}
                  onValueChange={(value) => updateFilters({ role: value === "all" ? "all" : value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="תפקיד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התפקידים</SelectItem>
                    <SelectItem value="admin">מנהל</SelectItem>
                    <SelectItem value="professional">מטפל</SelectItem>
                    <SelectItem value="member">חבר</SelectItem>
                    <SelectItem value="partner">שותף</SelectItem>
                  </SelectContent>
                </Select>

                {/* Gender Filter */}
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(value) => updateFilters({ gender: value === "all" ? "all" : value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="מגדר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל המגדרים</SelectItem>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                  value={filters.isActive === undefined ? "all" : filters.isActive.toString()}
                  onValueChange={(value) => updateFilters({ 
                    isActive: value === "all" ? undefined : value === "true" 
                  })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="true">פעילים</SelectItem>
                    <SelectItem value="false">לא פעילים</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {(filters.search || (filters.role && filters.role !== "all") || (filters.gender && filters.gender !== "all") || filters.isActive !== undefined) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-muted-foreground"
                  >
                    נקה מסננים
                  </Button>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>משתמש</TableHead>
                    <TableHead>פרטי קשר</TableHead>
                    <TableHead>תפקידים</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>אימותים</TableHead>
                    <TableHead>תאריך הצטרפות</TableHead>
                    <TableHead className="w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <div className="animate-pulse h-12 bg-gray-100 rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <User className="h-8 w-8 text-muted-foreground" />
                          <p>לא נמצאו משתמשים</p>
                          {(filters.search || filters.role || filters.gender) && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              נקה מסננים
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayUsers.map((user) => (
                      <TableRow key={user._id} className={user.isActive === false ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.gender === "male" ? "זכר" : user.gender === "female" ? "נקבה" : "אחר"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {formatPhoneForDisplay(user.phone)}
                            </div>
                            {user.email && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getRoleBadge(user.roles)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user)}
                        </TableCell>
                        <TableCell>
                          {getVerificationBadges(user)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {formatDate(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
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

                              {!user.roles.includes("admin") && (
                                <>
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem
                                    onClick={() => handleToggleUserStatus(user._id)}
                                    disabled={togglingStatus === user._id}
                                  >
                                    {user.isActive !== false ? (
                                      <>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        {togglingStatus === user._id ? "מבטל..." : "בטל הפעלה"}
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="mr-2 h-4 w-4" />
                                        {togglingStatus === user._id ? "מפעיל..." : "הפעל"}
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      setDeletingUser(user)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    הסתר לצמיתות
                                  </DropdownMenuItem>
                                </>
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
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  מציג {((currentPage - 1) * (filters.limit || 20)) + 1} עד {Math.min(currentPage * (filters.limit || 20), totalUsers)} מתוך {totalUsers} משתמשים
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevPage || loading}
                    className="flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    הקודם
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium px-2">
                      עמוד {currentPage} מתוך {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNextPage || loading}
                    className="flex items-center gap-1"
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
                פעולה זו תסתיר את המשתמש "{deletingUser?.name}" מהרשימה.
                המשתמש לא יוכל להתחבר למערכת אך הנתונים שלו יישמרו.
                <br />
                <strong>ניתן לבטל פעולה זו בעתיד.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
                disabled={isPending}
              >
                {isPending ? "מסתיר..." : "הסתר משתמש"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
} 