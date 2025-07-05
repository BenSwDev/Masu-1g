'use client'

import { useState, useEffect } from 'react'
import { ChevronUp, BookOpen, Clock, Star, Share2 } from 'lucide-react'

interface ReadingProgressProps {
  title: string
  readTime: number
  className?: string
}

export default function ReadingProgress({ title, readTime, className = '' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(readTime)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrolled = (scrollTop / docHeight) * 100
      
      setProgress(Math.min(scrolled, 100))
      setShowScrollTop(scrollTop > 300)
      
      // Calculate estimated time remaining
      const remainingPercent = Math.max(0, 100 - scrolled) / 100
      setEstimatedTimeRemaining(Math.ceil(readTime * remainingPercent))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readTime])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: window.location.href
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href)
      // You could show a toast notification here
    }
  }

  return (
    <>
      {/* Progress Bar */}
      <div className={`fixed top-0 left-0 right-0 z-30 ${className}`}>
        <div className="h-1 bg-gray-200 dark:bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Floating Action Panel */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="flex flex-col space-y-3">
          {/* Reading Progress Card */}
          {progress > 5 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(progress)}% הושלם
                  </span>
                </div>
                {estimatedTimeRemaining > 0 && (
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {estimatedTimeRemaining} דק'
                    </span>
                  </div>
                )}
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {title}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {/* Share Button */}
            <button
              onClick={shareArticle}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
              title="שתף מסמך"
            >
              <Share2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </button>

            {/* Bookmark Button */}
            <button
              onClick={() => {
                // Add to bookmarks logic here
                console.log('Bookmark clicked')
              }}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
              title="הוסף לסימניות"
            >
              <Star className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-yellow-500 dark:group-hover:text-yellow-400" />
            </button>

            {/* Scroll to Top Button */}
            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group animate-fade-in"
                title="חזרה לתחילת המסמך"
              >
                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  )
} 