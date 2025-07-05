'use client'

import { useEffect, useState } from 'react'
import { Search, Command, ArrowUp, ArrowDown, Enter, Escape } from 'lucide-react'

interface KeyboardShortcut {
  key: string
  description: string
  icon: React.ReactNode
  modifiers?: string[]
}

interface KeyboardShortcutsProps {
  onSearchFocus?: () => void
  className?: string
}

export default function KeyboardShortcuts({ onSearchFocus, className = '' }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'K',
      description: 'פתח חיפוש',
      icon: <Search className="w-4 h-4" />,
      modifiers: ['Ctrl']
    },
    {
      key: '↑/↓',
      description: 'נווט בתוצאות',
      icon: <ArrowUp className="w-4 h-4" />,
      modifiers: []
    },
    {
      key: 'Enter',
      description: 'בחר תוצאה',
      icon: <Enter className="w-4 h-4" />,
      modifiers: []
    },
    {
      key: 'Escape',
      description: 'סגור חיפוש',
      icon: <Escape className="w-4 h-4" />,
      modifiers: []
    },
    {
      key: '?',
      description: 'הצג עזרה',
      icon: <Command className="w-4 h-4" />,
      modifiers: []
    }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K for search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        onSearchFocus?.()
      }
      
      // ? for help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        // Don't show help if user is typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowHelp(true)
        }
      }
      
      // Escape to close help
      if (e.key === 'Escape' && showHelp) {
        e.preventDefault()
        setShowHelp(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSearchFocus, showHelp])

  return (
    <>
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowHelp(false)}
          />
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 max-w-md mx-4 relative">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              קיצורי מקלדת
            </h3>
            
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {shortcut.icon}
                    <span className="text-sm text-gray-700 dark:text-gray-300 mr-3">
                      {shortcut.description}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {shortcut.modifiers?.map((modifier, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-xs text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-slate-600">
                        {modifier}
                      </span>
                    ))}
                    {shortcut.modifiers && shortcut.modifiers.length > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">+</span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-xs text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-slate-600">
                      {shortcut.key}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                לחץ Escape או לחץ מחוץ לחלון כדי לסגור
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className={`fixed bottom-4 left-4 z-40 ${className}`}>
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          title="הצג קיצורי מקלדת (לחץ ?)"
        >
          <Command className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
        </button>
      </div>
    </>
  )
} 