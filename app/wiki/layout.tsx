import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'מרכז הידע MASU',
  description: 'תיעוד ומסמכים טכניים למערכת MASU',
}

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="wiki-layout bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  )
} 