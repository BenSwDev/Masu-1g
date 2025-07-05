'use client'

import { useState, useEffect } from 'react'
import { Menu, X, ArrowLeft, BookOpen, Shield, FileText, Users, Database, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarItem {
  name: string
  path: string
  type: 'user-doc' | 'developer-doc' | 'technical-doc'
  isActive: boolean
}

interface CategoryStructure {
  name: string
  items: SidebarItem[]
}

interface MobileSidebarProps {
  sidebarStructure: CategoryStructure[]
  className?: string
}

export default function MobileSidebar({ sidebarStructure, className = '' }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent scroll when sidebar is open - removed to allow page scrolling

  const getCategoryIcon = (categoryName: string) => {
    const icons = {
      'admin-pages': <Shield className="w-4 h-4" />,
      'orders-pages': <FileText className="w-4 h-4" />
    }
    return icons[categoryName as keyof typeof icons] || <BookOpen className="w-4 h-4" />
  }

  const getDocTypeIcon = (type: string) => {
    const icons = {
      'user-doc': <Users className="w-4 h-4" />,
      'developer-doc': <Database className="w-4 h-4" />,
      'technical-doc': <Settings className="w-4 h-4" />
    }
    return icons[type as keyof typeof icons] || <FileText className="w-4 h-4" />
  }

  const getDocTypeColor = (type: string) => {
    const colors = {
      'user-doc': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'developer-doc': 'bg-blue-100 text-blue-800 border-blue-200',
      'technical-doc': 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getDocTypeName = (type: string) => {
    const names = {
      'user-doc': 'מדריך למשתמש',
      'developer-doc': 'תיעוד למפתחים',
      'technical-doc': 'מסמך טכני'
    }
    return names[type as keyof typeof names] || 'מסמך'
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`lg:hidden fixed top-4 right-4 z-50 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${className}`}
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <Link 
              href="/wiki" 
              className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              חזרה למרכז הידע
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {sidebarStructure.map((category) => (
              <div key={category.name} className="mb-8">
                <div className="flex items-center mb-4">
                  {getCategoryIcon(category.name)}
                  <h3 className="font-semibold text-gray-900 dark:text-white mr-2">
                    {category.name}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <Link
                      key={`${item.name}-${item.type}`}
                      href={`/wiki/${item.path}`}
                      className={`flex items-center p-3 rounded-lg transition-colors ${
                        item.isActive 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className={`p-1 rounded border ${getDocTypeColor(item.type)} mr-3`}>
                        {getDocTypeIcon(item.type)}
                      </div>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{getDocTypeName(item.type)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              מרכז הידע MASU
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 