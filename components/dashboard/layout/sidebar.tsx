"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/common/ui/button"
import { Avatar, AvatarFallback } from "@/components/common/ui/avatar"
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
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/common/ui/sheet"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/common/ui/dropdown-menu"
import { toast } from "@/components/common/ui/use-toast"
import { setActiveRole } from "@/actions/role-actions"

interface SidebarProps {
  isMobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

// Role Switcher Component
const RoleSwitcher = ({ isCollapsed = false }: { isCollapsed?: boolean }) => {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  if (!session?.user) return null

  const { roles, activeRole } = session.user

  // If user has only one role, don't show the switcher
  if (!roles || roles.length <= 1) return null

  // Get role icon and label
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
        return language === "he" ? "מנהל" : language === "ru" ? "Администратор" : "Admin"
      case "professional":
        return language === "he" ? "בעל מקצוע" : language === "ru" ? "Профессионал" : "Professional"
      case "partner":
        return language === "he" ? "שותף" : language === "ru" ? "Партнер" : "Partner"
      case "member":
        return language === "he" ? "חבר" : language === "ru" ? "Участник" : "Member"
      default:
        return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }

  const handleRoleSwitch = async (role: string) => {
    if (role === activeRole) return
    setIsLoading(true)
    try {
      // Update in DB
      const result = await setActiveRole(role)
      if (result.success || result.activeRole) {
        // Always update session to the new/fallback role
        await update({ activeRole: result.activeRole || role })
        toast({ title: "החלפת תפקיד בהצלחה", variant: "default" })
        // Always redirect to the main dashboard page of the new role
        router.push(`/dashboard/${result.activeRole || role}`)
      } else {
        toast({ title: "לא ניתן להחליף לתפקיד זה", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error switching role:", error)
      toast({ title: "שגיאה בהחלפת תפקיד", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Get current role icon and label
  const currentRoleIcon = getRoleIcon(activeRole)
  const currentRoleLabel = getRoleLabel(activeRole)

  return (
    <div className={cn("px-4 py-2", isCollapsed ? "flex justify-center" : "")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={isCollapsed ? "icon" : "default"}
            className={cn(
              "w-full justify-start border-turquoise-200 hover:bg-turquoise-50 hover:text-turquoise-700",
              isCollapsed && "h-10 w-10 p-0",
            )}
            disabled={isLoading}
          >
            {isCollapsed ? (
              currentRoleIcon
            ) : (
              <>
                {currentRoleIcon}
                <span className="mx-2">{currentRoleLabel}</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          {roles.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
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
  const { t, dir } = useTranslation()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Debug logging
  useEffect(() => {
    console.log("Sidebar - Session status:", status)
    console.log("Sidebar - Session data:", session)
  }, [session, status])

  // Get user initials for avatar
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/login" })
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

  // Get menu items based on active role
  const getMenuItems = () => {
    const activeRole = session?.user?.activeRole || "member"

    // Base menu items for all users
    const baseItems = [
      {
        title: t("dashboard.sidebar.dashboard"),
        icon: LayoutDashboard,
        href: `/dashboard/${activeRole}`,
        isActive: pathname === `/dashboard/${activeRole}` || pathname === "/dashboard",
      },
    ]

    // Add role-specific menu items
    if (activeRole === "admin") {
      baseItems.push(
        {
          title: t("dashboard.sidebar.users"),
          icon: User,
          href: "/dashboard/admin/users",
          isActive: pathname === "/dashboard/admin/users",
        },
        {
          title: t("dashboard.sidebar.treatments"),
          icon: Shield,
          href: "/dashboard/admin/treatments",
          isActive: pathname === "/dashboard/admin/treatments",
        },
        {
          title: t("dashboard.sidebar.workingHours"),
          icon: Clock,
          href: "/dashboard/admin/working-hours",
          isActive: pathname === "/dashboard/admin/working-hours",
        },
        {
          title: t("dashboard.sidebar.subscriptions"),
          icon: CreditCard,
          href: "/dashboard/admin/subscriptions",
          isActive: pathname === "/dashboard/admin/subscriptions",
        },
        {
          title: t("dashboard.sidebar.userSubscriptions"),
          icon: CreditCard,
          href: "/dashboard/admin/user-subscriptions",
          isActive: pathname === "/dashboard/admin/user-subscriptions",
        },
        {
          title: t("dashboard.sidebar.coupons"),
          icon: CreditCard,
          href: "/dashboard/admin/coupons",
          isActive: pathname === "/dashboard/admin/coupons",
        },
        {
          title: t("dashboard.sidebar.giftVouchers"),
          icon: Gift,
          href: "/dashboard/admin/gift-vouchers",
          isActive: pathname === "/dashboard/admin/gift-vouchers",
        },
      )
    } else if (activeRole === "member") {
      baseItems.push(
        {
          title: t("dashboard.sidebar.addresses"),
          icon: MapPin,
          href: "/dashboard/member/addresses",
          isActive: pathname === "/dashboard/member/addresses",
        },
        {
          title: t("dashboard.sidebar.paymentMethods"),
          icon: CreditCard,
          href: "/dashboard/member/payment-methods",
          isActive: pathname === "/dashboard/member/payment-methods",
        },
        {
          title: t("dashboard.sidebar.subscriptions"),
          icon: CreditCard,
          href: "/dashboard/member/subscriptions",
          isActive: pathname === "/dashboard/member/subscriptions",
        },
        {
          title: t("dashboard.sidebar.giftVouchers"),
          icon: Gift,
          href: "/dashboard/member/gift-vouchers",
          isActive: pathname === "/dashboard/member/gift-vouchers",
        },
      )
    } else if (activeRole === "professional") {
      baseItems.push(
        {
          title: t("dashboard.sidebar.profile"),
          icon: User,
          href: "/dashboard/professional/profile",
          isActive: pathname === "/dashboard/professional/profile",
        },
        {
          title: t("dashboard.sidebar.location"),
          icon: MapPin,
          href: "/dashboard/professional/location",
          isActive: pathname === "/dashboard/professional/location",
        },
        {
          title: t("dashboard.sidebar.bankAccount"),
          icon: CreditCard,
          href: "/dashboard/professional/bank-account",
          isActive: pathname === "/dashboard/professional/bank-account",
        },
        {
          title: t("dashboard.sidebar.documents"),
          icon: FileText,
          href: "/dashboard/professional/documents",
          isActive: pathname === "/dashboard/professional/documents",
        },
      )
    } else if (activeRole === "partner") {
      baseItems.push(
        {
          title: t("dashboard.sidebar.profile"),
          icon: User,
          href: "/dashboard/partner/profile",
          isActive: pathname === "/dashboard/partner/profile",
        },
        {
          title: t("dashboard.sidebar.coupons"),
          icon: CreditCard,
          href: "/dashboard/partner/assigned-coupons",
          isActive: pathname === "/dashboard/partner/assigned-coupons",
        },
      )
    }

    return baseItems
  }

  // Get quick action buttons for member role
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

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Enhanced sidebar header for desktop
  const renderDesktopHeader = () => (
    <div className="flex h-16 items-center justify-between px-4 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white shadow-lg">
      {!isCollapsed && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide">Masu</h2>
            <p className="text-xs text-turquoise-100">Dashboard</p>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn("text-white hover:bg-white/20 transition-all duration-200", isCollapsed && "mx-auto")}
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

  const renderDesktopUserSectionWithDropdown = () => (
    <div className={cn("border-b border-gray-200", isCollapsed ? "py-3" : "p-3")}>
      {" "}
      {/* Adjusted padding */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto relative rounded-lg",
              isCollapsed ? "px-0 justify-center py-2" : "p-0 text-left hover:bg-gray-100",
            )}
            aria-label="User menu options"
          >
            {!isCollapsed ? (
              <div className="flex items-center gap-3 w-full p-2">
                <Avatar className="h-10 w-10 ring-1 ring-turquoise-100 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-semibold text-sm">
                    {getUserInitials(session?.user?.name, session?.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {session?.user?.name || session?.user?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 ml-1 opacity-90 flex-shrink-0" />
              </div>
            ) : (
              <Avatar className="h-9 w-9 ring-1 ring-turquoise-100 shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-semibold text-xs">
                  {getUserInitials(session?.user?.name, session?.user?.email)}
                </AvatarFallback>
              </Avatar>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-60"
          align={isCollapsed ? "end" : "start"}
          side={isCollapsed ? "right" : "bottom"}
          sideOffset={isCollapsed ? 12 : 8}
        >
          <DropdownMenuItem onClick={() => navigateTo("/dashboard/profile")} className="cursor-pointer group">
            <User className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600" />
            <span className="group-hover:text-turquoise-600">{t("dashboard.sidebar.profile")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigateTo("/dashboard/account")} className="cursor-pointer group">
            <Settings className="mr-2 h-4 w-4 text-gray-500 group-hover:text-turquoise-600" />
            <span className="group-hover:text-turquoise-600">{t("dashboard.sidebar.account")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-600 hover:!bg-red-50 hover:!text-red-700 focus:bg-red-50 focus:text-red-700 cursor-pointer group"
          >
            <LogOut className="mr-2 h-4 w-4 text-red-600 group-hover:text-red-700" />
            <span className="group-hover:text-red-700">{t("dashboard.sidebar.signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderMobileUserSectionWithDropdown = () => (
    <div className="p-4 bg-gradient-to-r from-turquoise-50 to-turquoise-100 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-0 hover:bg-transparent flex items-center gap-3 text-left rounded-lg"
            aria-label="User menu options"
          >
            <Avatar className="h-12 w-12 ring-1 ring-white shadow-md flex-shrink-0">
              <AvatarFallback className="bg-turquoise-500 text-white font-bold text-base">
                {getUserInitials(session?.user?.name, session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-800 truncate">
                {session?.user?.name || session?.user?.email}
              </h3>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500 opacity-90 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[calc(100vw-5rem)] max-w-[280px]" // Adjusted max-width
          side="bottom"
          align="center"
          sideOffset={10}
        >
          <DropdownMenuItem
            onClick={() => {
              navigateTo("/dashboard/profile")
              onMobileOpenChange(false)
            }}
            className="cursor-pointer py-2.5 px-3 text-sm group"
          >
            <User className="mr-2.5 h-4 w-4 text-gray-500 group-hover:text-turquoise-600" />
            <span className="group-hover:text-turquoise-600">{t("dashboard.sidebar.profile")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigateTo("/dashboard/account")
              onMobileOpenChange(false)
            }}
            className="cursor-pointer py-2.5 px-3 text-sm group"
          >
            <Settings className="mr-2.5 h-4 w-4 text-gray-500 group-hover:text-turquoise-600" />
            <span className="group-hover:text-turquoise-600">{t("dashboard.sidebar.account")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              handleSignOut()
              onMobileOpenChange(false)
            }}
            className="text-red-600 hover:!bg-red-50 hover:!text-red-700 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2.5 px-3 text-sm group"
          >
            <LogOut className="mr-2.5 h-4 w-4 text-red-600 group-hover:text-red-700" />
            <span className="group-hover:text-red-700">{t("dashboard.sidebar.signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderMemberQuickActionsDesktop = () => {
    const quickActions = getMemberQuickActions()

    if (!quickActions || quickActions.length === 0) {
      return null
    }

    return (
      <div className="p-2 space-y-2">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} passHref>
            <Button variant={action.variant} className="w-full justify-start">
              <action.icon className="h-4 w-4 mr-2" />
              {action.title}
            </Button>
          </Link>
        ))}
      </div>
    )
  }

  const renderDesktopMenuItems = (menuItems: any[]) => {
    return (
      <div className="space-y-1">
        {menuItems.map((item) => (
          <Link key={item.title} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                item.isActive ? "bg-turquoise-50 text-turquoise-700 font-medium" : "hover:bg-gray-100",
                isCollapsed ? "px-0 justify-center" : "pl-4",
              )}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {!isCollapsed && <span>{item.title}</span>}
            </Button>
          </Link>
        ))}
      </div>
    )
  }

  const renderMemberQuickActionsMobile = () => {
    const quickActions = getMemberQuickActions()

    if (!quickActions || quickActions.length === 0) {
      return null
    }

    return (
      <div className="p-4 space-y-3 border-b">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} passHref>
            <Button variant={action.variant} className="w-full justify-center">
              <action.icon className="h-5 w-5 mr-2" />
              {action.title}
            </Button>
          </Link>
        ))}
      </div>
    )
  }

  const renderMobileMenuItems = (menuItems: any[]) => {
    return (
      <div className="space-y-2 px-4">
        {menuItems.map((item) => (
          <Link key={item.title} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                item.isActive ? "bg-turquoise-50 text-turquoise-700 font-medium" : "hover:bg-gray-100",
              )}
              onClick={() => onMobileOpenChange(false)}
            >
              <item.icon className="h-5 w-5 mr-2" />
              {item.title}
            </Button>
          </Link>
        ))}
      </div>
    )
  }

  // Desktop sidebar - enhanced design
  const DesktopSidebar = (
    <div
      className={cn(
        "hidden md:flex h-screen flex-col bg-white transition-all duration-300 shadow-xl border-r border-gray-200",
        isCollapsed ? "w-16" : "w-64",
        dir === "rtl" ? "border-l" : "border-r",
      )}
    >
      {/* Enhanced Header */}
      {renderDesktopHeader()}

      {/* User Account Section */}
      {renderDesktopUserSectionWithDropdown()}

      {/* Member Quick Actions */}
      {renderMemberQuickActionsDesktop()}

      {/* Sidebar content */}
      <div className="flex-1 overflow-auto py-6 px-2 bg-gradient-to-b from-white to-gray-50">
        {/* Main menu items */}
        {renderDesktopMenuItems(getMenuItems())}
      </div>

      {/* Role Switcher */}
      <RoleSwitcher isCollapsed={isCollapsed} />
    </div>
  )

  // Mobile sidebar (Sheet component) - enhanced design
  const MobileSidebar = (
    <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="p-0 w-80 bg-gray-50 flex flex-col">
        {/* User Account Section - Enhanced */}
        {renderMobileUserSectionWithDropdown()}

        {/* Member Quick Actions */}
        {renderMemberQuickActionsMobile()}

        {/* Navigation Content */}
        <div className="flex-1 overflow-auto py-6">
          {/* Main menu items */}
          {renderMobileMenuItems(getMenuItems())}
        </div>

        {/* Role Switcher */}
        <div className="px-6 py-2">
          <RoleSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {DesktopSidebar}
      {MobileSidebar}
    </>
  )
}
