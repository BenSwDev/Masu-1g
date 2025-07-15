"use client"

import type React from "react"
import { useEffect } from "react"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add fallback classes for browsers that don't support :has()
    document.documentElement.classList.add('main-active')
    document.body.classList.add('main-active')
    
    // Cleanup function to remove classes when component unmounts
    return () => {
      document.documentElement.classList.remove('main-active')
      document.body.classList.remove('main-active')
    }
  }, [])

  return (
    <div className="main-layout">
      {children}
    </div>
  )
} 