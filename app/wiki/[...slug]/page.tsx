import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

export const dynamic = 'force-dynamic'

interface Params {
  slug?: string[]
}

export default async function WikiPage({ params }: { params: Params }) {
  const slug = params.slug ?? []
  const docsDir = path.join(process.cwd(), 'user-docs')
  const targetPath = path.join(docsDir, ...slug)

  try {
    const stat = await fs.stat(targetPath)
    if (stat.isDirectory()) {
      const items = await fs.readdir(targetPath, { withFileTypes: true })
      return (
        <div className="p-4 space-y-2">
          <h1 className="text-2xl font-bold">{slug.join('/') || 'Wiki'}</h1>
          <ul className="list-disc pl-4">
            {items.map((item) => (
              <li key={item.name}>
                <Link href={`/wiki/${[...slug, item.name].join('/')}`}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    const content = await fs.readFile(targetPath, 'utf8')
    return (
      <article className="p-4 whitespace-pre-wrap" dir="auto">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    )
  } catch (err) {
    console.error(err)
    notFound()
  }
}
