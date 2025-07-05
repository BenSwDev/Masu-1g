import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import { Suspense } from 'react'
import { Search, BookOpen, Users, Settings, FileText, TrendingUp, Database, Shield } from 'lucide-react'
import WikiSearch from '@/components/wiki/wiki-search'
import KeyboardShortcuts from '@/components/wiki/keyboard-shortcuts'

export const dynamic = 'force-dynamic'

interface CategoryData {
  name: string
  path: string
  description: string
  icon: React.ReactNode
  color: string
  itemsCount: number
  items: Array<{
    name: string
    path: string
    description: string
    type: 'user-doc' | 'developer-doc' | 'technical-doc'
  }>
}

async function getWikiStructure(): Promise<CategoryData[]> {
  const docsDir = path.join(process.cwd(), 'user-docs')
  const categories = await fs.readdir(docsDir, { withFileTypes: true })
  
  const categoryData: CategoryData[] = []
  
  for (const category of categories) {
    if (category.isDirectory()) {
      const categoryPath = path.join(docsDir, category.name)
      const subcategories = await fs.readdir(categoryPath, { withFileTypes: true })
      
      const items = []
      for (const subcat of subcategories) {
        if (subcat.isDirectory()) {
          const subcatPath = path.join(categoryPath, subcat.name)
          const files = await fs.readdir(subcatPath)
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const type = file.replace('.md', '') as 'user-doc' | 'developer-doc' | 'technical-doc'
              const description = getDocDescription(type)
              
              items.push({
                name: subcat.name,
                path: `${category.name}/${subcat.name}/${file}`,
                description,
                type
              })
            }
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
        itemsCount: items.length,
        items
      })
    }
  }
  
  return categoryData
}

function getCategoryMetadata(categoryName: string) {
  const metadata = {
    'admin-pages': {
      icon: <Shield className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-purple-500 to-purple-700',
      description: 'מסמכי ניהול מערכת עבור מנהלים'
    },
    'orders-pages': {
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-blue-500 to-blue-700',
      description: 'תיעוד עמודי הזמנות ורכישות'
    }
  }
  
  return metadata[categoryName as keyof typeof metadata] || {
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-gradient-to-br from-gray-500 to-gray-700',
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
    'user-doc': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'developer-doc': 'bg-blue-100 text-blue-800 border-blue-200',
    'technical-doc': 'bg-orange-100 text-orange-800 border-orange-200'
  }
  
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export default async function WikiRoot() {
  const categories = await getWikiStructure()
  const totalDocs = categories.reduce((sum, cat) => sum + cat.itemsCount, 0)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <BookOpen className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              מרכז הידע MASU
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              כל המידע והתיעוד שאתה צריך לניהול המערכת והפעלתה
            </p>
            
            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-2xl font-bold">{totalDocs}</div>
                    <div className="text-sm opacity-90">סה״כ מסמכים</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-md">
                <div className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-2xl font-bold">{categories.length}</div>
                    <div className="text-sm opacity-90">קטגוריות</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-lg shadow-md">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <div>
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm opacity-90">מעודכן</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <WikiSearch className="max-w-2xl mx-auto" />
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {categories.map((category) => (
            <div
              key={category.name}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Category Header */}
              <div className={`${category.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {category.icon}
                    <div className="mr-4">
                      <h3 className="text-xl font-bold">{category.name}</h3>
                      <p className="text-sm opacity-90">{category.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{category.itemsCount}</div>
                    <div className="text-sm opacity-90">מסמכים</div>
                  </div>
                </div>
              </div>

              {/* Category Content */}
              <div className="p-6">
                <div className="space-y-3">
                  {category.items.slice(0, 5).map((item, index) => (
                    <Link
                      key={`${item.name}-${item.type}`}
                      href={`/wiki/${item.path}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-md border ${getDocTypeColor(item.type)} mr-3`}>
                            {getDocTypeIcon(item.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          ←
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {category.items.length > 5 && (
                    <Link
                      href={`/wiki/${category.path}`}
                      className="block w-full text-center py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      הצג עוד {category.items.length - 5} מסמכים...
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>מרכז הידע MASU - מעודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  )
}
