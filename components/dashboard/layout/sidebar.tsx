"use client"

import { useEffect, useState } from "react" // Added useCallback
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  ChevronDown,
  Briefcase,
  Handshake,
  Clock,
  MapPin,
  CreditCard,
  FileText,
  Gift,
  Calendar,
  CalendarCheck2,
  Bell,
  SlidersHorizontal,
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/common/ui/sheet"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { toast } from "@/components/common/ui/use-toast"
import { setActiveRole } from "@/actions/role-actions"
import { TreatmentPreferencesModal } from "@/components/dashboard/preferences/treatment-preferences-modal" // Import modal
import { NotificationsModal } from "@/components/dashboard/preferences/notifications-modal" // Import modal
import type { ITreatmentPreferences, INotificationPreferences } from "@/lib/db/models/user" // Import preference types

interface SidebarProps {
  isMobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

// Role Switcher Component (with Tooltip for collapsed state)
const RoleSwitcher = ({ isCollapsed = false }: { isCollapsed?: boolean }) => {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { t, language } = useTranslation() // t for tooltip content
  const [isLoading, setIsLoading] = useState(false)

  if (!session?.user) return null
  const { roles, activeRole } = session.user
  if (!roles || roles.length <= 1) return null

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-5 w-5" />
      case "professional":
        return <Briefcase className="h-5 w-5" />
      case "partner":
        return <Handshake className="h-5 w-5" />
      case "member":
        return <User className="h-5 w-5" />
      default:
        return <Shield className="h-5 w-5" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return t("roles.admin")
      case "professional":
        return t("roles.professional")
      case "partner":
        return t("roles.partner")
      case "member":
        return t("roles.member")
      default:
        return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }

  const handleRoleSwitch = async (role: string) => {
    if (role === activeRole) return
    setIsLoading(true)
    try {
      const result = await setActiveRole(role)
      if (result.success || result.activeRole) {
        await update({ activeRole: result.activeRole || role }) // This will trigger JWT update
        toast({ title: t("notifications.roleSwitchSuccess"), variant: "default" })
        router.push(`/dashboard/${result.activeRole || role}`)
      } else {
        toast({ title: t("notifications.roleSwitchError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error switching role:", error)
      toast({ title: t("notifications.roleSwitchError"), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentRoleIcon = getRoleIcon(activeRole)
  const currentRoleLabel = getRoleLabel(activeRole)
  const roleSwitcherTooltipContent = t("dashboard.sidebar.roleSwitcherTooltip") + `: ${currentRoleLabel}`

  if (isCollapsed) {
    return (
      <div className="px-2.5 py-3 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                  disabled={isLoading}
                  aria-label={roleSwitcherTooltipContent}
                >
                  {currentRoleIcon}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" sideOffset={12} className="w-52">
                {roles.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={cn(
                      "flex items-center gap-2.5 cursor-pointer py-2 px-3 text-sm",
                      role === activeRole && "bg-turquoise-50 font-medium text-turquoise-700",
                    )}
                  >
                    {getRoleIcon(role)}
                    <span>{getRoleLabel(role)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p>{roleSwitcherTooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start border-gray-300 hover:bg-gray-100 hover:border-gray-400 text-gray-700 h-11 px-3"
            disabled={isLoading}
          >
            {currentRoleIcon}
            <span className="mx-2.5 text-sm font-medium">{currentRoleLabel}</span>
            <ChevronDown className="h-4 w-4 ml-auto text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          {roles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer py-2 px-3 text-sm",
                role === activeRole && "bg-turquoise-50 font-medium text-turquoise-700",
              )}
            >
              {getRoleIcon(role)}
              <span>{getRoleLabel(role)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function DashboardSidebar({ isMobileOpen, onMobileOpenChange }: SidebarProps) {
  const { t, dir, language } = useTranslation()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session, update: updateSession } = useSession() // Added updateSession
  const router = useRouter()

  // State for modals
  const [isTreatmentPreferencesModalOpen, setIsTreatmentPreferencesModalOpen] = useState(false)
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false)

  // State for fetched preferences to pass to modals
  // These can also be read directly from session if session update is quick enough
  const [treatmentPreferences, setTreatmentPreferences] = useState<ITreatmentPreferences | undefined>(
    session?.user?.treatmentPreferences,
  )
  const [notificationPreferences, setNotificationPreferences] = useState<INotificationPreferences | undefined>(
    session?.user?.notificationPreferences,
  )

  // Fetch preferences when component mounts or session changes
  // This ensures modals have the latest data if not relying solely on session prop updates
  useEffect(() => {
    if (session?.user) {
      if (session.user.treatmentPreferences) {
        setTreatmentPreferences(session.user.treatmentPreferences)
      }
      if (session.user.notificationPreferences) {
        setNotificationPreferences(session.user.notificationPreferences)
      }
      // Optionally, fetch fresh from server if session might be stale for preferences
      // const fetchPrefs = async () => {
      //   const prefsData = await getUserPreferences();
      //   if (prefsData.success) {
      //     setTreatmentPreferences(prefsData.treatmentPreferences);
      //     setNotificationPreferences(prefsData.notificationPreferences);
      //     // Optionally update session if fetched data is different and more up-to-date
      //     // await updateSession({ treatmentPreferences: prefsData.treatmentPreferences, notificationPreferences: prefsData.notificationPreferences });
      //   }
      // };
      // fetchPrefs();
    }
  }, [session?.user, session?.user?.treatmentPreferences, session?.user?.notificationPreferences])

  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const getUserInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "U"
  }

  const handleSignOut = async () => await signOut({ callbackUrl: "/auth/login" })
  const navigateTo = (path: string) => router.push(path)

  const getMenuItems = () => {
    const activeRole = session?.user?.activeRole || "member"
    const baseItems = [
      {
        title: t("dashboard.sidebar.dashboard"),
        icon: LayoutDashboard,
        href: `/dashboard/${activeRole}`,
        isActive: pathname === `/dashboard/${activeRole}` || pathname === "/dashboard",
      },
    ]

    const roleMenus: Record<string, Array<{ titleKey: string; icon: any; hrefSuffix: string }>> = {
      admin: [
        { titleKey: "users", icon: User, hrefSuffix: "users" },
        { titleKey: "treatments", icon: Shield, hrefSuffix: "treatments" },
        { titleKey: "workingHours", icon: Clock, hrefSuffix: "working-hours" },
        { titleKey: "subscriptions", icon: CreditCard, hrefSuffix: "subscriptions" },
        { titleKey: "userSubscriptions", icon: CreditCard, hrefSuffix: "user-subscriptions" },
        { titleKey: "coupons", icon: Gift, hrefSuffix: "coupons" },
        { titleKey: "giftVouchers", icon: Gift, hrefSuffix: "gift-vouchers" },
      ],
      member: [
        { titleKey: "addresses", icon: MapPin, hrefSuffix: "addresses" },
        { titleKey: "paymentMethods", icon: CreditCard, hrefSuffix: "payment-methods" },
        { titleKey: "myBookings", icon: CalendarCheck2, hrefSuffix: "bookings" }, // ADD THIS LINE
        { titleKey: "subscriptions", icon: CreditCard, hrefSuffix: "subscriptions" },
        { titleKey: "giftVouchers", icon: Gift, hrefSuffix: "gift-vouchers" },
      ],
      professional: [
        { titleKey: "profile", icon: User, hrefSuffix: "profile" },
        { titleKey: "location", icon: MapPin, hrefSuffix: "location" },
        { titleKey: "bankAccount", icon: CreditCard, hrefSuffix: "bank-account" },
        { titleKey: "documents", icon: FileText, hrefSuffix: "documents" },
      ],
      partner: [
        { titleKey: "profile", icon: User, hrefSuffix: "profile" },
        { titleKey: "assignedCoupons", icon: Gift, hrefSuffix: "assigned-coupons" }, // Changed titleKey
      ],
    }
    ;(roleMenus[activeRole] || []).forEach((item) => {
      const href = `/dashboard/${activeRole}/${item.hrefSuffix}`
      baseItems.push({
        title: t(`dashboard.sidebar.${item.titleKey}`),
        icon: item.icon,
        href,
        isActive: pathname === href,
      })
    })
    return baseItems
  }

  const getMemberQuickActions = () => {
    if (session?.user?.activeRole !== "member") return []
    return [
      {
        title: t("dashboard.sidebar.bookTreatment"),
        icon: Calendar,
        href: "/dashboard/member/book-treatment",
        variant: "default" as const,
      },
      {
        title: t("dashboard.sidebar.purchaseSubscription"),
        icon: CreditCard,
        href: "/dashboard/member/subscriptions/purchase",
        variant: "outline" as const,
      },
      {
        title: t("dashboard.sidebar.purchaseGiftVoucher"),
        icon: Gift,
        href: "/dashboard/member/gift-vouchers/purchase",
        variant: "outline" as const,
      },
    ]
  }

  const renderDesktopHeader = () => (
    <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white shadow-md">
      {!isCollapsed && (
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Masu</h2>
            <p className="text-xs text-turquoise-100">Dashboard</p>
          </div>
        </Link>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn("text-white hover:bg-white/20 transition-all duration-200 rounded-md", isCollapsed && "mx-auto")}
      >
        {dir === "rtl" ? (
          isCollapsed ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )
        ) : isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>
    </div>
  )

  const userMenuTriggerTooltip = t("dashboard.sidebar.userMenu.toggleTooltip") // Placeholder, will be translated

  const renderDesktopUserSectionWithDropdown = () => (
    <div className={cn("border-b border-gray-200", isCollapsed ? "py-2.5" : "p-2.5")}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto relative rounded-md",
                  isCollapsed ? "px-0 justify-center py-1.5" : "p-0 text-left hover:bg-gray-100/80",
                )}
                aria-label={userMenuTriggerTooltip}
              >
                {!isCollapsed ? (
                  <div className="flex items-center gap-2.5 w-full p-1.5">
                    <Avatar className="h-9 w-9 ring-1 ring-turquoise-200 shadow-sm flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-semibold text-xs">
                        {getUserInitials(session?.user?.name, session?.user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {session?.user?.name || t("common.anonymousUser")}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 ml-1 opacity-80 flex-shrink-0" />
                  </div>
                ) : (
                  <Avatar className="h-9 w-9 ring-1 ring-turquoise-200 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-semibold text-xs">
                      {getUserInitials(session?.user?.name, session?.user?.email)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" sideOffset={8}>
              <p>{userMenuTriggerTooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent
          className="w-60"
          align={isCollapsed ? "end" : "start"}
          side={isCollapsed ? "right" : "bottom"}
          sideOffset={isCollapsed ? 10 : 6}
        >
          <DropdownMenuItem
            onClick={() => navigateTo("/dashboard/profile")}
            className="cursor-pointer group py-2 px-2.5"
          >
            <User className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600 transition-colors" />
            <span className="text-sm group-hover:text-turquoise-600 transition-colors">
              {t("dashboard.sidebar.profile")}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo("/dashboard/account")}
            className="cursor-pointer group py-2 px-2.5"
          >
            <Settings className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600 transition-colors" />
            <span className="text-sm group-hover:text-turquoise-600 transition-colors">
              {t("dashboard.sidebar.account")}
            </span>
          </DropdownMenuItem>
          {/* New Menu Items Start */}
          <DropdownMenuItem
            onClick={() => setIsTreatmentPreferencesModalOpen(true)}
            className="cursor-pointer group py-2 px-2.5"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600 transition-colors" />
            <span className="text-sm group-hover:text-turquoise-600 transition-colors">
              {t("dashboard.sidebar.userMenu.treatmentPreferences")}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsNotificationsModalOpen(true)}
            className="cursor-pointer group py-2 px-2.5"
          >
            <Bell className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600 transition-colors" />
            <span className="text-sm group-hover:text-turquoise-600 transition-colors">
              {t("dashboard.sidebar.userMenu.notifications")}
            </span>
          </DropdownMenuItem>
          {/* New Menu Items End */}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-500 hover:!bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer group py-2 px-2.5"
          >
            <LogOut className="mr-2 h-4 w-4 text-red-500 group-hover:text-red-600 transition-colors" />
            <span className="text-sm group-hover:text-red-600 transition-colors">{t("dashboard.sidebar.signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderMobileUserSectionWithDropdown = () => (
    <div className="p-3.5 bg-gradient-to-r from-turquoise-50 to-turquoise-100 border-b border-gray-200/80">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-0 hover:bg-transparent flex items-center gap-3 text-left rounded-lg"
            aria-label={userMenuTriggerTooltip}
          >
            <Avatar className="h-11 w-11 ring-1 ring-white/80 shadow-md flex-shrink-0">
              <AvatarFallback className="bg-turquoise-500 text-white font-semibold text-sm">
                {getUserInitials(session?.user?.name, session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium text-gray-800 truncate">
                {session?.user?.name || t("common.anonymousUser")}
              </h3>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500 opacity-80 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[calc(100vw-4.5rem)] max-w-[290px]"
          side="bottom"
          align="center"
          sideOffset={10}
        >
          {[
            { labelKey: "dashboard.sidebar.profile", icon: User, action: () => navigateTo("/dashboard/profile") },
            { labelKey: "dashboard.sidebar.account", icon: Settings, action: () => navigateTo("/dashboard/account") },
            // New Mobile Menu Items
            {
              labelKey: "dashboard.sidebar.userMenu.treatmentPreferences", // Use translation key
              icon: SlidersHorizontal,
              action: () => setIsTreatmentPreferencesModalOpen(true),
            },
            {
              labelKey: "dashboard.sidebar.userMenu.notifications",
              icon: Bell,
              action: () => setIsNotificationsModalOpen(true),
            }, // Use translation key
          ].map(
            (
              item, // Ensure t() is used for all items
            ) => (
              <DropdownMenuItem
                key={item.labelKey}
                onClick={() => {
                  item.action()
                  onMobileOpenChange(false)
                }}
                className="cursor-pointer group py-2.5 px-3"
              >
                <item.icon className="mr-2.5 h-4 w-4 text-gray-500 group-hover:text-turquoise-600 transition-colors" />
                <span className="text-sm group-hover:text-turquoise-600 transition-colors">{t(item.labelKey)}</span>
              </DropdownMenuItem>
            ),
          )}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => {
              handleSignOut()
              onMobileOpenChange(false)
            }}
            className="text-red-500 hover:!bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer group py-2.5 px-3"
          >
            <LogOut className="mr-2.5 h-4 w-4 text-red-500 group-hover:text-red-600 transition-colors" />
            <span className="text-sm group-hover:text-red-600 transition-colors">{t("dashboard.sidebar.signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderMemberQuickActions = (isMobile: boolean) => {
    const quickActions = getMemberQuickActions()
    if (!quickActions || quickActions.length === 0) return null

    return (
      <div className={cn("border-b border-gray-200/80", isMobile ? "p-3.5 space-y-2.5" : "p-2.5 space-y-1.5")}>
        {quickActions.map((action) => (
          <Button
            key={action.title}
            variant={action.variant === "default" ? "default" : "outline"}
            size={isMobile ? "default" : "sm"}
            className={cn(
              "w-full justify-start text-sm h-auto py-2.5",
              isMobile ? "px-4" : "px-3",
              action.variant === "outline" &&
                "border-gray-300 text-gray-700 hover:border-turquoise-500 hover:bg-turquoise-50 hover:text-turquoise-700",
              action.variant === "default" &&
                "bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white shadow-sm hover:shadow-md",
              isCollapsed && !isMobile && "justify-center !px-0 w-10 h-10", // Collapsed specific style
            )}
            onClick={() => {
              navigateTo(action.href)
              if (isMobile) onMobileOpenChange(false)
            }}
            title={isCollapsed && !isMobile ? action.title : undefined} // Tooltip for collapsed desktop
          >
            <action.icon
              className={cn(
                "flex-shrink-0",
                isMobile ? "h-5 w-5 mr-3" : "h-4 w-4",
                isCollapsed && !isMobile ? "mr-0" : isMobile ? "mr-3" : "mr-2.5",
              )}
            />
            {!(isCollapsed && !isMobile) && <span>{action.title}</span>}
          </Button>
        ))}
      </div>
    )
  }

  const renderMenuItems = (items: ReturnType<typeof getMenuItems>, isMobile: boolean) => (
    <nav className={cn("flex flex-col gap-0.5", isMobile ? "px-3.5 py-4" : "px-2 py-3")}>
      {items.map((item) => {
        const content = (
          <>
            <item.icon
              className={cn(
                "flex-shrink-0 transition-colors",
                isMobile ? "h-5 w-5" : "h-[18px] w-[18px]",
                isCollapsed && !isMobile ? "mx-auto" : isMobile ? "mr-3" : "mr-2.5",
                item.isActive
                  ? isCollapsed && !isMobile
                    ? "text-white"
                    : "text-turquoise-600"
                  : "text-gray-500 group-hover:text-turquoise-600",
              )}
            />
            {!(isCollapsed && !isMobile) && (
              <span
                className={cn(
                  "text-sm transition-colors",
                  item.isActive ? "font-medium text-turquoise-600" : "text-gray-700 group-hover:text-turquoise-600",
                )}
              >
                {item.title}
              </span>
            )}
          </>
        )

        const linkButton = (
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto justify-start group transition-all duration-150 ease-in-out",
              isMobile ? "py-3 px-3 rounded-lg" : "py-2.5 px-2.5 rounded-md",
              item.isActive
                ? isCollapsed && !isMobile
                  ? "bg-turquoise-500 hover:bg-turquoise-600"
                  : "bg-turquoise-50 hover:bg-turquoise-100"
                : "hover:bg-gray-100/80",
              isCollapsed && !isMobile && "w-11 h-11 !p-0 flex items-center justify-center",
            )}
            onClick={() => {
              navigateTo(item.href)
              if (isMobile) onMobileOpenChange(false)
            }}
          >
            {content}
          </Button>
        )

        if (isCollapsed && !isMobile) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{linkButton}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          )
        }
        return <div key={item.href}>{linkButton}</div>
      })}
    </nav>
  )

  const DesktopSidebarContent = (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          "hidden md:flex h-screen flex-col bg-white transition-all duration-200 shadow-lg border-gray-200/80",
          isCollapsed ? "w-[72px]" : "w-64",
          dir === "rtl" ? "border-l" : "border-r",
        )}
      >
        {renderDesktopHeader()}
        {renderDesktopUserSectionWithDropdown()}
        {renderMemberQuickActions(false)}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrolling-touch">
          {renderMenuItems(getMenuItems(), false)}
        </div>
        <RoleSwitcher isCollapsed={isCollapsed} />
      </div>
    </TooltipProvider>
  )

  const MobileSidebarContent = (
    <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="p-0 w-[300px] bg-gray-50 flex flex-col">
        {renderMobileUserSectionWithDropdown()}
        {renderMemberQuickActions(true)}
        <div className="flex-1 overflow-y-auto scrolling-touch">{renderMenuItems(getMenuItems(), true)}</div>
        <div className="mt-auto border-t border-gray-200/80">
          <RoleSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {DesktopSidebarContent}
      {MobileSidebarContent}

      {/* Modals */}
      <TreatmentPreferencesModal
        isOpen={isTreatmentPreferencesModalOpen}
        onClose={() => setIsTreatmentPreferencesModalOpen(false)}
        currentPreferences={treatmentPreferences}
      />
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        currentPreferences={notificationPreferences}
      />
    </>
  )
}
