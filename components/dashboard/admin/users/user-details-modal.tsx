"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { format } from "date-fns"
import { UserRole } from "@/lib/db/models/user"
import { useTranslation } from "@/lib/translations/i18n"
import type { UserColumn } from "./users-columns"
import { Mail, Phone, Calendar, User, Shield, CheckCircle, XCircle, Clock } from "lucide-react"

interface UserDetailsModalProps {
  user: UserColumn | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsModal({ user, open, onOpenChange }: UserDetailsModalProps) {
  const { t } = useTranslation()

  if (!user) return null

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "destructive"
      case UserRole.PROFESSIONAL:
        return "default"
      case UserRole.PARTNER:
        return "secondary"
      default:
        return "outline"
    }
  }

  const getGenderDisplay = (gender?: string) => {
    switch (gender) {
      case "male":
        return t("users.gender.male")
      case "female":
        return t("users.gender.female")
      case "other":
        return t("users.gender.other")
      default:
        return "-"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("users.sections.personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{t("users.fields.name")}</div>
                  <div className="font-medium">{user.name}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{t("users.fields.gender")}</div>
                  <div>{getGenderDisplay(user.gender)}</div>
                </div>

                {user.dateOfBirth && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">{t("users.fields.dateOfBirth")}</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(user.dateOfBirth), "dd/MM/yyyy")}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("users.sections.contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="text-sm text-muted-foreground">{t("users.fields.email")}</div>
                    </div>
                  </div>
                  {user.emailVerified ? (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("users.verified")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      {t("users.notVerified")}
                    </Badge>
                  )}
                </div>

                {user.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium font-mono">{user.phone}</div>
                        <div className="text-sm text-muted-foreground">{t("users.fields.phone")}</div>
                      </div>
                    </div>
                    {user.phoneVerified ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("users.verified")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t("users.notVerified")}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("users.sections.rolesPermissions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t("users.fields.roles")}</div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge key={role} variant={role === user.activeRole ? getRoleBadgeVariant(role) : "outline"}>
                      {t(`users.roles.${role}`)}
                      {role === user.activeRole && " ★"}
                    </Badge>
                  ))}
                </div>
              </div>

              {user.activeRole && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{t("users.fields.activeRole")}</div>
                  <Badge variant={getRoleBadgeVariant(user.activeRole)}>{t(`users.roles.${user.activeRole}`)} ★</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("users.sections.systemInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{t("users.fields.createdAt")}</div>
                  <div>{format(new Date(user.createdAt), "dd/MM/yyyy HH:mm")}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">{t("users.fields.updatedAt")}</div>
                  <div>{format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
