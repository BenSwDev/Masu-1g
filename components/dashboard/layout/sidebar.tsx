"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"
import {
  LayoutDashboard,
  Users,
  Settings,
  ShoppingBag,
  Percent,
  Tag,
  ClipboardList,
  BarChart,
  Headphones,
  HelpCircle,
  LogOut,
  User,
  Package,
  Gift,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/common/ui/button"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

interface SidebarProps {
  className?: string
}

interface MenuItem {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  isActive: boolean
}

const DashboardSidebar: React.FC<SidebarProps> = ({ className }) => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { data: session } = useSession()
  const activeRole = session?.user?.role

  const getMenuItems = (): MenuItem[] => {
    if (activeRole === "admin") {
      return [
        {
          title: t("dashboard.sidebar.dashboard"),
          icon: LayoutDashboard,
          href: "/dashboard/admin",
          isActive: pathname === "/dashboard/admin",
        },
        {
          title: t("dashboard.sidebar.users"),
          icon: Users,
          href: "/dashboard/admin/users",
          isActive: pathname === "/dashboard/admin/users",
        },
        {
          title: t("dashboard.sidebar.products"),
          icon: ShoppingBag,
          href: "/dashboard/admin/products",
          isActive: pathname === "/dashboard/admin/products",
        },
        {
          title: t("dashboard.sidebar.categories"),
          icon: Tag,
          href: "/dashboard/admin/categories",
          isActive: pathname === "/dashboard/admin/categories",
        },
        {
          title: t("dashboard.sidebar.orders"),
          icon: ClipboardList,
          href: "/dashboard/admin/orders",
          isActive: pathname === "/dashboard/admin/orders",
        },
        {
          title: t("dashboard.sidebar.coupons"),
          icon: Percent,
          href: "/dashboard/admin/coupons",
          isActive: pathname === "/dashboard/admin/coupons",
        },
        {
          title: t("dashboard.sidebar.giftVouchers"),
          icon: Gift,
          href: "/dashboard/admin/gift-vouchers",
          isActive: pathname === "/dashboard/admin/gift-vouchers",
        },
        {
          title: t("dashboard.sidebar.subscriptions"),
          icon: Package,
          href: "/dashboard/admin/subscriptions",
          isActive: pathname === "/dashboard/admin/subscriptions",
        },
        {
          title: t("dashboard.sidebar.workingHours"),
          icon: BarChart,
          href: "/dashboard/admin/working-hours",
          isActive: pathname === "/dashboard/admin/working-hours",
        },
        {
          title: t("dashboard.sidebar.support"),
          icon: Headphones,
          href: "/dashboard/admin/support",
          isActive: pathname === "/dashboard/admin/support",
        },
        {
          title: t("dashboard.sidebar.settings"),
          icon: Settings,
          href: "/dashboard/admin/settings",
          isActive: pathname === "/dashboard/admin/settings",
        },
      ]
    } else if (activeRole === "member") {
      return [
        {
          title: t("dashboard.sidebar.dashboard"),
          icon: LayoutDashboard,
          href: "/dashboard/member",
          isActive: pathname === "/dashboard/member",
        },
        {
          title: t("dashboard.sidebar.profile"),
          icon: User,
          href: "/dashboard/member/profile",
          isActive: pathname === "/dashboard/member/profile",
        },
        {
          title: t("dashboard.sidebar.addresses"),
          icon: User,
          href: "/dashboard/member/addresses",
          isActive: pathname === "/dashboard/member/addresses",
        },
        {
          title: t("dashboard.sidebar.paymentMethods"),
          icon: User,
          href: "/dashboard/member/payment-methods",
          isActive: pathname === "/dashboard/member/payment-methods",
        },
        {
          title: t("dashboard.sidebar.support"),
          icon: HelpCircle,
          href: "/dashboard/member/support",
          isActive: pathname === "/dashboard/member/support",
        },
      ]
    } else {
      return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <div className={cn("flex flex-col w-64 border-r", className)}>
      <div className="px-4 py-6">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">E-Commerce</span>
        </Link>
      </div>
      <div className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost", className: "w-full justify-start gap-2" }),
              item.isActive ? "bg-secondary" : "hover:bg-secondary/50",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
      <div className="p-4">
        <button
          className={cn(buttonVariants({ variant: "outline", className: "w-full justify-start gap-2" }))}
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {t("dashboard.sidebar.signOut")}
        </button>
      </div>
    </div>
  )
}

export { DashboardSidebar }
export default DashboardSidebar
