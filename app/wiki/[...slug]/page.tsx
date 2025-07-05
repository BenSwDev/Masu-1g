import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { 
  ChevronRight, 
  Home, 
  BookOpen, 
  Users, 
  Settings, 
  Database, 
  FileText, 
  Calendar,
  User,
  Search,
  Copy,
  Check,
  ArrowLeft,
  Menu,
  X,
  Hash,
  Shield,
  Eye,
  Star,
  Clock
} from 'lucide-react'
import { Suspense } from 'react'
import MobileSidebar from '@/components/wiki/mobile-sidebar'
import KeyboardShortcuts from '@/components/wiki/keyboard-shortcuts'
import ReadingProgress from '@/components/wiki/reading-progress'

export const dynamic = 'force-dynamic'

interface Params {
  slug?: string[]
}

interface TableOfContentsItem {
  id: string
  text: string
  level: number
}

interface DocumentMetadata {
  title: string
  description: string
  type: 'user-doc' | 'developer-doc' | 'technical-doc'
  category: string
  subcategory: string
  lastModified: Date
  readTime: number
}

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

function extractTableOfContents(content: string): TableOfContentsItem[] {
  const headings = content.match(/^#{1,6}\s+(.+)$/gm) || []
  
  return headings.map((heading, index) => {
    const level = heading.match(/^#+/)?.[0].length || 1
    const text = heading.replace(/^#+\s+/, '')
    const id = `heading-${index}`
    
    return { id, text, level }
  })
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

async function getDocumentMetadata(slug: string[]): Promise<DocumentMetadata | null> {
  if (slug.length < 3) return null
  
  const [category, subcategory, filename] = slug
  const type = filename.replace('.md', '') as 'user-doc' | 'developer-doc' | 'technical-doc'
  
  const filePath = path.join(process.cwd(), 'user-docs', category, subcategory, filename)
  
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const stats = await fs.stat(filePath)
    
    const title = content.match(/^#\s+(.+)$/m)?.[1] || subcategory
    const description = content.match(/^#{1,6}\s+.+\n\n(.+)$/m)?.[1] || ''
    
    return {
      title,
      description,
      type,
      category,
      subcategory,
      lastModified: stats.mtime,
      readTime: calculateReadTime(content)
    }
  } catch {
    return null
  }
}

async function getSidebarStructure(currentPath: string[]): Promise<CategoryStructure[]> {
  const docsDir = path.join(process.cwd(), 'user-docs')
  const categories = await fs.readdir(docsDir, { withFileTypes: true })
  
  const structure: CategoryStructure[] = []
  
  for (const category of categories) {
    if (category.isDirectory()) {
      const categoryPath = path.join(docsDir, category.name)
      const subcategories = await fs.readdir(categoryPath, { withFileTypes: true })
      
      const items: SidebarItem[] = []
      
      for (const subcat of subcategories) {
        if (subcat.isDirectory()) {
          const subcatPath = path.join(categoryPath, subcat.name)
          const files = await fs.readdir(subcatPath)
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const type = file.replace('.md', '') as 'user-doc' | 'developer-doc' | 'technical-doc'
              const itemPath = `${category.name}/${subcat.name}/${file}`
              const isActive = currentPath.join('/') === itemPath
              
              items.push({
                name: subcat.name,
                path: itemPath,
                type,
                isActive
              })
            }
          }
        }
      }
      
      structure.push({
        name: category.name,
        items
      })
    }
  }
  
  return structure
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

function getDocTypeName(type: string) {
  const names = {
    'user-doc': 'מדריך למשתמש',
    'developer-doc': 'תיעוד למפתחים',
    'technical-doc': 'מסמך טכני'
  }
  
  return names[type as keyof typeof names] || 'מסמך'
}

function getCategoryIcon(categoryName: string) {
  const icons = {
    'admin-pages': <Shield className="w-4 h-4" />,
    'orders-pages': <FileText className="w-4 h-4" />
  }
  
  return icons[categoryName as keyof typeof icons] || <BookOpen className="w-4 h-4" />
}

export default async function WikiPage({ params }: { params: Params }) {
  const slug = params.slug ?? []
  const docsDir = path.join(process.cwd(), 'user-docs')
  const targetPath = path.join(docsDir, ...slug)
  const relative = path.relative(docsDir, targetPath)
  
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    console.warn('Invalid wiki path traversal attempt:', slug.join('/'))
    notFound()
  }

  try {
    const stat = await fs.stat(targetPath)
    const sidebarStructure = await getSidebarStructure(slug)
    
    if (stat.isDirectory()) {
      // Directory listing view
      const items = await fs.readdir(targetPath, { withFileTypes: true })
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
          <MobileSidebar sidebarStructure={sidebarStructure} />
          <div className="flex">
            {/* Sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
              <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen overflow-y-auto">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <Link href="/wiki" className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    חזרה למרכז הידע
                  </Link>
                </div>
                
                <div className="p-6">
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
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <div className="p-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-8" dir="rtl">
                  <Link href="/wiki" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Home className="w-4 h-4" />
                  </Link>
                  {slug.map((segment, index) => (
                    <div key={index} className="flex items-center">
                      <ChevronRight className="w-4 h-4 mx-2 rotate-180" />
                      <Link 
                        href={`/wiki/${slug.slice(0, index + 1).join('/')}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {segment}
                      </Link>
                    </div>
                  ))}
                </nav>

                {/* Directory Content */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
                  <div className="flex items-center mb-6">
                    <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-4" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {slug.join(' / ') || 'Wiki'}
                    </h1>
                  </div>
                  
                  <div className="grid gap-4">
                    {items.map((item) => (
                      <Link
                        key={item.name}
                        href={`/wiki/${[...slug, item.name].join('/')}`}
                        className="group block p-6 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                              {item.isDirectory() ? (
                                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 text-sm">
                                {item.isDirectory() ? 'תיקיה' : 'קובץ'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors rotate-180" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Keyboard Shortcuts */}
          <KeyboardShortcuts />
        </div>
      )
    }

    // Document view
    const content = await fs.readFile(targetPath, 'utf8')
    const metadata = await getDocumentMetadata(slug)
    const tableOfContents = extractTableOfContents(content)
    
    if (!metadata) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <MobileSidebar sidebarStructure={sidebarStructure} />
        <div className="flex">
          {/* Sidebar */}
          <div className="hidden lg:flex lg:flex-shrink-0">
            <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <Link href="/wiki" className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  חזרה למרכז הידע
                </Link>
              </div>
              
              <div className="p-6">
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
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="flex">
              {/* Article Content */}
              <div className="flex-1 p-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-8" dir="rtl">
                  <Link href="/wiki" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Home className="w-4 h-4" />
                  </Link>
                  {slug.map((segment, index) => (
                    <div key={index} className="flex items-center">
                      <ChevronRight className="w-4 h-4 mx-2 rotate-180" />
                      <Link 
                        href={`/wiki/${slug.slice(0, index + 1).join('/')}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {segment}
                      </Link>
                    </div>
                  ))}
                </nav>

                {/* Article Header */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <div className={`p-2 rounded-lg border ${getDocTypeColor(metadata.type)} mr-4`}>
                          {getDocTypeIcon(metadata.type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {getDocTypeName(metadata.type)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {metadata.category} / {metadata.subcategory}
                          </div>
                        </div>
                      </div>
                      
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        {metadata.title}
                      </h1>
                      
                      {metadata.description && (
                        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                          {metadata.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {metadata.readTime} דקות קריאה
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          עודכן: {metadata.lastModified.toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Article Body */}
                <article className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-8 prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300" dir="rtl">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        },
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-6">
                            {children}
                          </h3>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-400 pl-6 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            {children}
                          </td>
                        )
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </article>
              </div>

              {/* Table of Contents */}
              {tableOfContents.length > 0 && (
                <div className="hidden xl:block w-64 p-8">
                  <div className="sticky top-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Hash className="w-5 h-5 mr-2" />
                        תוכן עניינים
                      </h3>
                      <nav className="space-y-2">
                        {tableOfContents.map((item, index) => (
                          <a
                            key={index}
                            href={`#${item.id}`}
                            className={`block text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                              item.level === 1 ? 'font-medium text-gray-900 dark:text-white' :
                              item.level === 2 ? 'text-gray-700 dark:text-gray-300 pr-4' :
                              'text-gray-500 dark:text-gray-400 pr-8'
                            }`}
                          >
                            {item.text}
                          </a>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Reading Progress */}
        <ReadingProgress title={metadata.title} readTime={metadata.readTime} />
        
        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />
      </div>
    )
  } catch (err) {
    console.error(err)
    notFound()
  }
}
