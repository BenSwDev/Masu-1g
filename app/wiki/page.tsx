import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import { Suspense } from 'react'
import { Search, BookOpen, Users, Settings, FileText, TrendingUp, Database, Shield, ChevronDown, ChevronRight } from 'lucide-react'
import WikiSearch from '@/components/wiki/wiki-search'
import CollapsibleCategory from '@/components/wiki/collapsible-category'

export const dynamic = 'force-dynamic'

interface SubcategoryData {
  name: string
  path: string
  docs: Array<{
    name: string
    path: string
    description: string
    type: 'user-doc' | 'developer-doc' | 'technical-doc'
  }>
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

async function getWikiStructure(): Promise<CategoryData[]> {
  const docsDir = path.join(process.cwd(), 'user-docs')
  const categories = await fs.readdir(docsDir, { withFileTypes: true })
  
  const categoryData: CategoryData[] = []
  
  for (const category of categories) {
    if (category.isDirectory()) {
      const categoryPath = path.join(docsDir, category.name)
      const subcategories = await fs.readdir(categoryPath, { withFileTypes: true })
      
      const subcategoryData: SubcategoryData[] = []
      let totalDocs = 0
      
      for (const subcat of subcategories) {
        if (subcat.isDirectory()) {
          const subcatPath = path.join(categoryPath, subcat.name)
          const files = await fs.readdir(subcatPath)
          
          const docs = []
          for (const file of files) {
            if (file.endsWith('.md')) {
              const type = file.replace('.md', '') as 'user-doc' | 'developer-doc' | 'technical-doc'
              const description = getDocDescription(type)
              
              docs.push({
                name: file.replace('.md', ''),
                path: `${category.name}/${subcat.name}/${file}`,
                description,
                type
              })
              totalDocs++
            }
          }
          
          if (docs.length > 0) {
            subcategoryData.push({
              name: subcat.name,
              path: `${category.name}/${subcat.name}`,
              docs
            })
          }
        }
      }
      
      const { icon, color, description } = getCategoryMetadata(category.name)
      
      categoryData.push({
        name: category.name,
        path: category.name,
        description,
        icon,
        color,
        subcategories: subcategoryData,
        totalDocs
      })
    }
  }
  
  return categoryData
}

function getCategoryMetadata(categoryName: string) {
  const metadata = {
    'admin-pages': {
      icon: <Shield className="w-5 h-5" />,
      color: 'border-purple-200 bg-purple-50 dark:bg-purple-900/10',
      description: 'מסמכי ניהול מערכת עבור מנהלים'
    },
    'orders-pages': {
      icon: <FileText className="w-5 h-5" />,
      color: 'border-blue-200 bg-blue-50 dark:bg-blue-900/10',
      description: 'תיעוד עמודי הזמנות ורכישות'
    }
  }
  
  return metadata[categoryName as keyof typeof metadata] || {
    icon: <BookOpen className="w-5 h-5" />,
    color: 'border-gray-200 bg-gray-50 dark:bg-gray-900/10',
    description: 'תיעוד כללי'
  }
}

function getDocDescription(type: string) {
  const descriptions = {
    'user-doc': 'מדריך למשתמש',
    'developer-doc': 'תיעוד למפתחים',
    'technical-doc': 'מסמך טכני'
  }
  
  return descriptions[type as keyof typeof descriptions] || 'מסמך'
}

export default async function WikiRoot() {
  const categories = await getWikiStructure()
  const totalDocs = categories.reduce((sum, cat) => sum + cat.totalDocs, 0)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  מרכز הידע MASU
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalDocs} מסמכים ב-{categories.length} קטגוריות
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <WikiSearch className="max-w-lg" />
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-6">
          {categories.map((category) => (
            <CollapsibleCategory
              key={category.name}
              category={category}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
