'use client'

import { useEffect } from 'react'

export default function WikiScrollFix() {
  useEffect(() => {
    // Add classes to enable scrolling in wiki pages
    const html = document.documentElement
    const body = document.body
    
    html.classList.add('wiki-active')
    body.classList.add('wiki-active')
    
    // Cleanup on unmount (when leaving wiki pages)
    return () => {
      html.classList.remove('wiki-active')
      body.classList.remove('wiki-active')
    }
  }, [])

  return null
} 