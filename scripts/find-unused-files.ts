#!/usr/bin/env ts-node

import { readFileSync, readdirSync, statSync } from "fs"
import { join, extname, relative } from "path"

interface UnusedFile {
  path: string
  size: number
  reason: string
}

interface FileUsage {
  path: string
  importedBy: string[]
  exports: string[]
  isUsed: boolean
}

class UnusedFileFinder {
  private projectRoot: string
  private allFiles: string[] = []
  private fileUsage: Map<string, FileUsage> = new Map()
  private unusedFiles: UnusedFile[] = []

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  async findUnusedFiles(): Promise<UnusedFile[]> {
    console.log("🔍 סורק קבצים...")
    await this.scanAllFiles()

    console.log("📊 מנתח שימוש...")
    await this.analyzeUsage()

    console.log("🗑️ מזהה קבצים לא בשימוש...")
    await this.identifyUnusedFiles()

    return this.unusedFiles
  }

  private async scanAllFiles(): Promise<void> {
    const scanDir = (dir: string): void => {
      const items = readdirSync(dir)

      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)

        // Skip node_modules, .git, .next, etc.
        if (item.startsWith(".") || item === "node_modules" || item === ".next") {
          continue
        }

        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (this.isRelevantFile(fullPath)) {
          this.allFiles.push(fullPath)
          this.fileUsage.set(fullPath, {
            path: fullPath,
            importedBy: [],
            exports: [],
            isUsed: false,
          })
        }
      }
    }

    scanDir(this.projectRoot)
    console.log(`📁 נמצאו ${this.allFiles.length} קבצים רלוונטיים`)
  }

  private isRelevantFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase()
    const relevantExtensions = [".ts", ".tsx", ".js", ".jsx"]
    return relevantExtensions.includes(ext)
  }

  private async analyzeUsage(): Promise<void> {
    for (const filePath of this.allFiles) {
      try {
        const content = readFileSync(filePath, "utf-8")
        this.analyzeFileImports(filePath, content)
        this.analyzeFileExports(filePath, content)
      } catch (error) {
        console.warn(`⚠️ לא ניתן לקרוא קובץ: ${filePath}`)
      }
    }
  }

  private analyzeFileImports(filePath: string, content: string): void {
    // Regex patterns for imports
    const importPatterns = [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ]

    for (const pattern of importPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1]
        const resolvedPath = this.resolveImportPath(filePath, importPath)

        if (resolvedPath && this.fileUsage.has(resolvedPath)) {
          const usage = this.fileUsage.get(resolvedPath)!
          usage.importedBy.push(filePath)
          usage.isUsed = true
        }
      }
    }
  }

  private analyzeFileExports(filePath: string, content: string): void {
    // Regex patterns for exports
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /export\s+\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(\w+)/g,
    ]

    const exports: string[] = []

    for (const pattern of exportPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        if (match[1].includes(",")) {
          // Handle multiple exports in braces
          const multipleExports = match[1].split(",").map(e => e.trim())
          exports.push(...multipleExports)
        } else {
          exports.push(match[1])
        }
      }
    }

    const usage = this.fileUsage.get(filePath)
    if (usage) {
      usage.exports = exports
    }
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const resolvedPath = join(fromFile, "..", importPath)
      return this.findExistingFile(resolvedPath)
    }

    // Handle absolute imports starting with @/
    if (importPath.startsWith("@/")) {
      const relativePath = importPath.substring(2)
      const resolvedPath = join(this.projectRoot, relativePath)
      return this.findExistingFile(resolvedPath)
    }

    return null
  }

  private findExistingFile(basePath: string): string | null {
    const extensions = [".ts", ".tsx", ".js", ".jsx"]

    // Try exact path
    for (const ext of extensions) {
      const fullPath = basePath + ext
      if (this.allFiles.includes(fullPath)) {
        return fullPath
      }
    }

    // Try index files
    for (const ext of extensions) {
      const indexPath = join(basePath, "index" + ext)
      if (this.allFiles.includes(indexPath)) {
        return indexPath
      }
    }

    return null
  }

  private async identifyUnusedFiles(): Promise<void> {
    for (const [filePath, usage] of this.fileUsage.entries()) {
      if (!usage.isUsed && !this.isSpecialFile(filePath)) {
        const stat = statSync(filePath)
        const relativePath = relative(this.projectRoot, filePath)

        this.unusedFiles.push({
          path: relativePath,
          size: stat.size,
          reason: this.getUnusedReason(usage),
        })
      }
    }

    // Sort by size (largest first)
    this.unusedFiles.sort((a, b) => b.size - a.size)
  }

  private isSpecialFile(filePath: string): boolean {
    const relativePath = relative(this.projectRoot, filePath)

    // Files that should not be considered unused
    const specialPatterns = [
      /^app\/.*\/page\.tsx$/, // Next.js pages
      /^app\/.*\/layout\.tsx$/, // Next.js layouts
      /^app\/.*\/loading\.tsx$/, // Next.js loading
      /^app\/.*\/error\.tsx$/, // Next.js error
      /^app\/.*\/not-found\.tsx$/, // Next.js not-found
      /^app\/.*\/route\.ts$/, // Next.js API routes
      /^middleware\.ts$/, // Next.js middleware
      /^next\.config\.js$/, // Next.js config
      /^tailwind\.config\.js$/, // Tailwind config
      /^components\.json$/, // Shadcn config
      /^scripts\/.*/, // Scripts directory
      /\.d\.ts$/, // Type definitions
    ]

    return specialPatterns.some(pattern => pattern.test(relativePath))
  }

  private getUnusedReason(usage: FileUsage): string {
    if (usage.importedBy.length === 0) {
      return "לא מיובא על ידי אף קובץ"
    }
    if (usage.exports.length === 0) {
      return "לא מייצא שום דבר"
    }
    return "לא בשימוש"
  }
}

// Main execution
async function main() {
  const finder = new UnusedFileFinder(process.cwd())
  const unusedFiles = await finder.findUnusedFiles()

  console.log("\n📋 דוח קבצים לא בשימוש:")
  console.log("=".repeat(50))

  if (unusedFiles.length === 0) {
    console.log("✅ לא נמצאו קבצים לא בשימוש!")
    return
  }

  let totalSize = 0
  unusedFiles.forEach((file, index) => {
    const sizeKB = (file.size / 1024).toFixed(1)
    console.log(`${index + 1}. ${file.path}`)
    console.log(`   📏 גודל: ${sizeKB}KB`)
    console.log(`   💭 סיבה: ${file.reason}`)
    console.log("")
    totalSize += file.size
  })

  const totalSizeKB = (totalSize / 1024).toFixed(1)
  console.log(`📊 סיכום: ${unusedFiles.length} קבצים לא בשימוש`)
  console.log(`💾 סה"כ גודל: ${totalSizeKB}KB`)

  // Write to file
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: unusedFiles.length,
    totalSizeKB: parseFloat(totalSizeKB),
    files: unusedFiles,
  }

  const fs = require("fs")
  fs.writeFileSync("unused-files-report.json", JSON.stringify(report, null, 2))
  console.log("\n📄 הדוח נשמר ב: unused-files-report.json")
}

if (require.main === module) {
  main().catch(console.error)
}

export { UnusedFileFinder }
