'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter, Clock, FileText, Users, Database, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SearchResult {
  title: string
  path: string
  type: 'user-doc' | 'developer-doc' | 'technical-doc'
  category: string
  subcategory: string
  excerpt: string
  matchScore: number
}

interface SearchFilters {
  type: string[]
  category: string[]
}

interface WikiSearchProps {
  className?: string
  onResultClick?: () => void
}

export default function WikiSearch({ className = '', onResultClick }: WikiSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    category: []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wiki-recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Mock search function - in real implementation, this would call an API
  const searchDocuments = useCallback(async (searchQuery: string, searchFilters: SearchFilters): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return []
    
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Mock search results - in real implementation, this would come from your search API
    const mockResults: SearchResult[] = [
      {
        title: 'ניהול משתמשים במערכת',
        path: 'admin-pages/users/user-doc.md',
        type: 'user-doc',
        category: 'admin-pages',
        subcategory: 'users',
        excerpt: 'מסך זה מאפשר למנהלי המערכת להוסיף, לערוך ולהסיר משתמשים קיימים ולצפות בסטטיסטיקות כלליות.',
        matchScore: 0.95
      },
      {
        title: 'תיעוד טכני - ניהול משתמשים',
        path: 'admin-pages/users/technical-doc.md',
        type: 'technical-doc',
        category: 'admin-pages',
        subcategory: 'users',
        excerpt: 'מסמך טכני המפרט את הארכיטקטורה והיישום של מערכת ניהול המשתמשים.',
        matchScore: 0.8
      },
      {
        title: 'ניהול הזמנות',
        path: 'admin-pages/bookings/user-doc.md',
        type: 'user-doc',
        category: 'admin-pages',
        subcategory: 'bookings',
        excerpt: 'מדריך שלם לניהול הזמנות במערכת, כולל יצירה, עריכה וביטול הזמנות.',
        matchScore: 0.7
      }
    ]
    
    // Filter results based on query and filters
    let filteredResults = mockResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    // Apply type filter
    if (searchFilters.type.length > 0) {
      filteredResults = filteredResults.filter(result => 
        searchFilters.type.includes(result.type)
      )
    }
    
    // Apply category filter
    if (searchFilters.category.length > 0) {
      filteredResults = filteredResults.filter(result => 
        searchFilters.category.includes(result.category)
      )
    }
    
    setIsLoading(false)
    return filteredResults.sort((a, b) => b.matchScore - a.matchScore)
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchDocuments(query, filters).then(setResults)
        setShowResults(true)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, filters, searchDocuments])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultClick(results[selectedIndex])
          }
          break
        case 'Escape':
          setShowResults(false)
          setSelectedIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showResults, results, selectedIndex])

  const handleResultClick = (result: SearchResult) => {
    // Add to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem('wiki-recent-searches', JSON.stringify(newRecentSearches))
    
    // Navigate to result
    router.push(`/wiki/${result.path}`)
    
    // Clear search
    setQuery('')
    setShowResults(false)
    setSelectedIndex(-1)
    
    onResultClick?.()
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setSelectedIndex(-1)
  }

  const toggleFilter = (filterType: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }))
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
      'user-doc': 'bg-emerald-100 text-emerald-800',
      'developer-doc': 'bg-blue-100 text-blue-800',
      'technical-doc': 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="חיפוש במסמכים... (Ctrl+K)"
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
          dir="rtl"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && (
            <button
              onClick={clearSearch}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors mr-1"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors mr-2 ${
              showFilters ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-400'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">סוג מסמך</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'user-doc', label: 'מדריך למשתמש' },
                  { value: 'developer-doc', label: 'תיעוד למפתחים' },
                  { value: 'technical-doc', label: 'מסמך טכני' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleFilter('type', value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.type.includes(value)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">קטגוריה</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'admin-pages', label: 'עמודי ניהול' },
                  { value: 'orders-pages', label: 'עמודי הזמנות' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleFilter('category', value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.category.includes(value)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-96 overflow-y-auto z-40">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">מחפש...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.path}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-right p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-lg ${getDocTypeColor(result.type)} mr-3 flex-shrink-0`}>
                      {getDocTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2">
                          {getDocTypeName(result.type)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {result.category} / {result.subcategory}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {result.excerpt}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">לא נמצאו תוצאות עבור "{query}"</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                חיפושים אחרונים
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center"
                >
                  <Clock className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
} 