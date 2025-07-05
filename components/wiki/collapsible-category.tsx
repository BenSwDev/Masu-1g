'use client'

import { useState } from 'react'
import { ChevronDown, Users, Database, Settings, FileText } from 'lucide-react'
import Link from 'next/link'

interface CategoryItem {
  name: string
  path: string
  description: string
  type: 'user-doc' | 'developer-doc' | 'technical-doc'
}

interface CategoryData {
  name: string
  path: string
  description: string
  icon: React.ReactNode
  color: string
  itemsCount: number
  items: CategoryItem[]
}

interface CollapsibleCategoryProps {
  category: CategoryData
}

function getDocTypeIcon(type: string) {
  const icons = {
    'user-doc': <Users className="w-4 h-4" />,
    'developer-doc': <Database className="w-4 h-4" />,
    'technical-doc': <Settings className="w-4 h-4" />
  }
  return icons[type as keyof typeof icons] || <FileText className="w-4 h-4" />
}

function getDocTypeColor(type: string) {
  const colors = {
    'user-doc': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    'developer-doc': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    'technical-doc': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
}

export default function CollapsibleCategory({ category }: CollapsibleCategoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Category Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg ${category.color}`}
      >
        <div className="flex items-center">
          {category.icon}
          <div className="mr-3 text-right">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {category.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {category.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-3">
            {category.itemsCount} מסמכים
          </span>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Category Content */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid gap-3">
            {category.items.map((item) => (
              <Link
                key={`${item.name}-${item.type}`}
                href={`/wiki/${item.path}`}
                className="group flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`p-2 rounded-md border ${getDocTypeColor(item.type)} mr-3 flex-shrink-0`}>
                  {getDocTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0">
                  ←
                </div>
              </Link>
            ))}
            
            {category.items.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>אין מסמכים בקטגוריה זו</p>
              </div>
            )}
          </div>
          
          {category.items.length > 10 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={`/wiki/${category.path}`}
                className="block w-full text-center py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                הצג את כל המסמכים בקטגוריה זו
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 