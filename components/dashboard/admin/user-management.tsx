"use client"

import { useState } from "react"
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
}

export function UserManagement({ users }: UserManagementProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [localUsers, setLocalUsers] = useState<UserData[]>(users)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, boolean>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline" className={getRoleBadgeColor(role)}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(role)}
                          {role}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
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

        {/* Edit Roles Dialog */}
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
