"use client"

import { Badge } from "@/components/common/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { Modal } from "@/components/common/ui/modal"
import { useTranslation } from "@/lib/translations/i18n"
import type { UserColumn } from "./users-columns"

interface UserDetailsModalProps {
  user: UserColumn | null
  isOpen: boolean
  onClose: () => void
}

export function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const { t } = useTranslation()

  if (!user) return null

  return (
    <Modal
      title={t("admin.users.details.title")}
      description={t("admin.users.details.description")}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* User Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="text-lg">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Separator />

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.users.details.contact_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.users.form.email")}</p>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.users.form.phone")}</p>
                <p className="text-sm">{user.phone}</p>
              </div>
            </div>
            {user.gender && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("admin.users.form.gender")}</p>
                <p className="text-sm">{t(`common.gender.${user.gender}`)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.users.details.roles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {t(`common.roles.${role}`)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.users.details.account_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("admin.users.details.member_since")}</p>
              <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Modal>
  )
}
