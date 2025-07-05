import type { Metadata } from 'next'
import WikiScrollFix from '@/components/wiki/wiki-scroll-fix'

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
    <>
      <WikiScrollFix />
      <div className="wiki-layout bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </>
  )
} 