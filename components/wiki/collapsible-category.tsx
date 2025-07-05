'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Users, Database, Settings, FileText, Folder, FolderOpen } from 'lucide-react'
import Link from 'next/link'

interface DocItem {
  name: string
  path: string
  description: string
  type: 'user-doc' | 'developer-doc' | 'technical-doc'
}

interface SubcategoryData {
  name: string
  path: string
  docs: DocItem[]
}

interface CategoryData {
  name: string
  path: string
  description: string
  icon: React.ReactNode
  color: string
  subcategories: SubcategoryData[]
  totalDocs: number
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

function SubcategoryItem({ subcategory }: { subcategory: SubcategoryData }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
      {/* Subcategory Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <div className="flex items-center">
          {isOpen ? (
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
          ) : (
            <Folder className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {subcategory.name}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            {subcategory.docs.length} מסמכים
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Documents */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="space-y-2">
            {subcategory.docs.map((doc) => (
              <Link
                key={doc.path}
                href={`/wiki/${doc.path}`}
                className="group flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`p-2 rounded-md border ${getDocTypeColor(doc.type)} mr-3 flex-shrink-0`}>
                  {getDocTypeIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {doc.description}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {doc.name}
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0">
                  ←
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
            {category.totalDocs} מסמכים
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
          <div className="space-y-4">
            {category.subcategories.map((subcategory) => (
              <SubcategoryItem key={subcategory.path} subcategory={subcategory} />
            ))}
            
            {category.subcategories.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>אין מסמכים בקטגוריה זו</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 