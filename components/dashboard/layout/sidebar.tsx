"use client"

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
  Package,
  Gift,
} from "lucide-react"
import { Sheet, SheetContent } from "@/components/common/ui/sheet"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
          title: t("dashboard.sidebar.clients"),
          icon: User,
          href: "/dashboard/admin/clients",
          isActive: pathname === "/dashboard/admin/clients",
        },
        {
          title: t("dashboard.sidebar.professionals"),
          icon: Briefcase,
          href: "/dashboard/admin/professionals",
          isActive: pathname === "/dashboard/admin/professionals",
        },
        {
          title: t("dashboard.sidebar.partners"),
          icon: Handshake,
          href: "/dashboard/admin/partners",
          isActive: pathname === "/dashboard/admin/partners",
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
        }
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
        }
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
        }
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
        }
      )
    }

    return baseItems
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

  // User account section for desktop - enhanced design
  const renderDesktopUserAccount = () => (
    <div className="p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
      {!isCollapsed ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-turquoise-200 shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-bold text-sm">
              {getUserInitials(session?.user?.name, session?.user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <p className="text-xs text-gray-600 truncate bg-gray-100 px-2 py-1 rounded-full">{session?.user?.email}</p>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <Avatar className="h-10 w-10 ring-2 ring-turquoise-200 shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-turquoise-400 to-turquoise-600 text-white font-bold text-xs">
              {getUserInitials(session?.user?.name, session?.user?.email)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  )

  // User account section for mobile - enhanced design
  const renderMobileUserAccount = () => (
    <div className="p-6 bg-gradient-to-r from-turquoise-50 to-turquoise-100 border-b">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-white shadow-lg">
          <AvatarFallback className="bg-turquoise-500 text-white font-bold text-lg">
            {getUserInitials(session?.user?.name, session?.user?.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {session?.user?.name || session?.user?.email}
            </h3>
          </div>
          <p className="text-sm text-gray-600 truncate">{session?.user?.email}</p>
        </div>
      </div>
    </div>
  )

  // Profile and Account buttons for desktop
  const renderDesktopProfileButtons = () => (
    <div className="p-4 space-y-2">
      {!isCollapsed ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo("/dashboard/profile")}
            className={cn(
              "w-full justify-start transition-all duration-200 font-medium border border-turquoise-200 hover:border-turquoise-300 shadow-sm hover:shadow-md",
              pathname === "/dashboard/profile"
                ? "bg-turquoise-50 text-turquoise-700"
                : "hover:bg-turquoise-50 hover:text-turquoise-700",
            )}
          >
            <User className="h-4 w-4 mr-2" />
            {t("dashboard.sidebar.profile")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo("/dashboard/account")}
            className={cn(
              "w-full justify-start transition-all duration-200 font-medium border border-turquoise-200 hover:border-turquoise-300 shadow-sm hover:shadow-md",
              pathname === "/dashboard/account"
                ? "bg-turquoise-50 text-turquoise-700"
                : "hover:bg-turquoise-50 hover:text-turquoise-700",
            )}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t("dashboard.sidebar.account")}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateTo("/dashboard/profile")}
            className={cn(
              "w-full transition-all duration-200 border border-turquoise-200 hover:border-turquoise-300 shadow-sm hover:shadow-md",
              pathname === "/dashboard/profile"
                ? "bg-turquoise-50 text-turquoise-700"
                : "hover:bg-turquoise-50 hover:text-turquoise-700",
            )}
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateTo("/dashboard/account")}
            className={cn(
              "w-full transition-all duration-200 border border-turquoise-200 hover:border-turquoise-300 shadow-sm hover:shadow-md",
              pathname === "/dashboard/account"
                ? "bg-turquoise-50 text-turquoise-700"
                : "hover:bg-turquoise-50 hover:text-turquoise-700",
            )}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )

  // Profile and Account buttons for mobile
  const renderMobileProfileButtons = () => (
    <div className="px-6 py-2 space-y-2">
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          navigateTo("/dashboard/profile")
          onMobileOpenChange(false)
        }}
        className={cn(
          "w-full justify-start rounded-xl h-12 font-medium transition-all duration-200 shadow-sm hover:shadow-md",
          pathname === "/dashboard/profile"
            ? "bg-turquoise-50 text-turquoise-700"
            : "hover:bg-turquoise-50 hover:text-turquoise-700",
        )}
      >
        <User className="h-5 w-5 mr-3" />
        <span className="text-base">{t("dashboard.sidebar.profile")}</span>
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          navigateTo("/dashboard/account")
          onMobileOpenChange(false)
        }}
        className={cn(
          "w-full justify-start rounded-xl h-12 font-medium transition-all duration-200 shadow-sm hover:shadow-md",
          pathname === "/dashboard/account"
            ? "bg-turquoise-50 text-turquoise-700"
            : "hover:bg-turquoise-50 hover:text-turquoise-700",
        )}
      >
        <Settings className="h-5 w-5 mr-3" />
        <span className="text-base">{t("dashboard.sidebar.account")}</span>
      </Button>
    </div>
  )

  // Enhanced Sign Out button for desktop
  const renderDesktopSignOut = () => (
    <div className="p-4 border-t border-gray-200 mt-auto bg-gradient-to-t from-gray-50 to-white">
      {!isCollapsed ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 font-medium border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("dashboard.sidebar.signOut")}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  // Enhanced Sign Out button for mobile
  const renderMobileSignOut = () => (
    <div className="p-6 border-t mt-auto bg-gray-50">
      <Button
        variant="ghost"
        size="lg"
        onClick={handleSignOut}
        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-14 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <LogOut className="h-5 w-5 mr-3" />
        <span className="text-base">{t("dashboard.sidebar.signOut")}</span>
      </Button>
    </div>
  )

  // Desktop menu items renderer - enhanced
  const renderDesktopMenuItems = (items: any[]) => (
    <div className="mb-6">
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200 mx-1",
              item.isActive
                ? "bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white font-semibold shadow-lg shadow-turquoise-500/25"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200",
              isCollapsed && "justify-center px-0 mx-2",
            )}
          >
            <item.icon className={cn("h-5 w-5", item.isActive ? "text-white" : "text-gray-500")} />
            {!isCollapsed && <span>{item.title}</span>}
          </Link>
        ))}
      </nav>
    </div>
  )

  // Mobile menu items renderer
  const renderMobileMenuItems = (items: any[]) => (
    <div className="mb-8">
      <nav className="space-y-2 px-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              item.isActive
                ? "bg-turquoise-500 text-white shadow-lg shadow-turquoise-500/25"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            )}
            onClick={() => onMobileOpenChange(false)}
          >
            <item.icon className={cn("h-5 w-5", item.isActive ? "text-white" : "text-gray-500")} />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  )

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
      {renderDesktopUserAccount()}

      {/* Sidebar content */}
      <div className="flex-1 overflow-auto py-6 px-2 bg-gradient-to-b from-white to-gray-50">
        {/* Main menu items */}
        {renderDesktopMenuItems(getMenuItems())}
      </div>

      {/* Role Switcher */}
      <RoleSwitcher isCollapsed={isCollapsed} />

      {/* Profile and Account Buttons */}
      {renderDesktopProfileButtons()}

      {/* Sign Out Button */}
      {renderDesktopSignOut()}
    </div>
  )

  // Mobile sidebar (Sheet component) - enhanced design
  const MobileSidebar = (
    <Sheet open={isMobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="p-0 w-80 bg-gray-50 flex flex-col">
        {/* User Account Section - Enhanced */}
        {renderMobileUserAccount()}

        {/* Navigation Content */}
        <div className="flex-1 overflow-auto py-6">
          {/* Main menu items */}
          {renderMobileMenuItems(getMenuItems())}
        </div>

        {/* Role Switcher */}
        <div className="px-6 py-2">
          <RoleSwitcher />
        </div>

        {/* Profile and Account Buttons */}
        {renderMobileProfileButtons()}

        {/* Sign Out Button */}
        {renderMobileSignOut()}
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
