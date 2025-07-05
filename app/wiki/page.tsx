import fs from 'fs/promises'
import path from 'path'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function WikiRoot() {
  const docsDir = path.join(process.cwd(), 'user-docs')
  const items = await fs.readdir(docsDir, { withFileTypes: true })
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Wiki</h1>
      <ul className="list-disc pl-4">
        {items.map((item) => (
          <li key={item.name}>
            <Link href={`/wiki/${item.name}`}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
