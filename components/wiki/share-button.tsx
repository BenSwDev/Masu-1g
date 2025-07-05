'use client'

import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  title: string
  description: string
}

export default function ShareButton({ title, description }: ShareButtonProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title,
        text: description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={handleShare}
        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        title="שתף דף זה"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  )
} 