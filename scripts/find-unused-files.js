#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

class UnusedFileFinder {
  constructor(projectRoot) {
    this.projectRoot = projectRoot
    this.allFiles = []
    this.fileUsage = new Map()
    this.unusedFiles = []
  }

  async findUnusedFiles() {
    console.log('🔍 סורק קבצים...')
    await this.scanAllFiles()
    
    console.log('📊 מנתח שימוש...')
    await this.analyzeUsage()
    
    console.log('🗑️ מזהה קבצים לא בשימוש...')
    await this.identifyUnusedFiles()
    
    return this.unusedFiles
  }

  async scanAllFiles() {
    const scanDir = (dir) => {
      try {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
          const fullPath = path.join(dir, item)
          
          // Skip problematic directories
          if (item.startsWith('.') || 
              item === 'node_modules' || 
              item === '.next' ||
              item === 'dist' ||
              item === 'build') {
            continue
          }
          
          try {
            const stat = fs.statSync(fullPath)
            
            if (stat.isDirectory()) {
              scanDir(fullPath)
            } else if (this.isRelevantFile(fullPath)) {
              this.allFiles.push(fullPath)
              this.fileUsage.set(fullPath, {
                path: fullPath,
                importedBy: [],
                exports: [],
                isUsed: false
              })
            }
          } catch (error) {
            // Skip files that can't be accessed
            continue
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        return
      }
    }
    
    scanDir(this.projectRoot)
    console.log(`📁 נמצאו ${this.allFiles.length} קבצים רלוונטיים`)
  }

  isRelevantFile(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const relevantExtensions = ['.ts', '.tsx', '.js', '.jsx']
    return relevantExtensions.includes(ext)
  }

  async analyzeUsage() {
    for (const filePath of this.allFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.analyzeFileImports(filePath, content)
        this.analyzeFileExports(filePath, content)
      } catch (error) {
        console.warn(`⚠️ לא ניתן לקרוא קובץ: ${filePath}`)
      }
    }
  }

  analyzeFileImports(filePath, content) {
    // Regex patterns for imports
    const importPatterns = [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ]

    for (const pattern of importPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1]
        const resolvedPath = this.resolveImportPath(filePath, importPath)
        
        if (resolvedPath && this.fileUsage.has(resolvedPath)) {
          const usage = this.fileUsage.get(resolvedPath)
          usage.importedBy.push(filePath)
          usage.isUsed = true
        }
      }
    }
  }

  analyzeFileExports(filePath, content) {
    // Regex patterns for exports
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /export\s+\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(\w+)/g
    ]

    const exports = []
    
    for (const pattern of exportPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].includes(',')) {
          // Handle multiple exports in braces
          const multipleExports = match[1].split(',').map(e => e.trim())
          exports.push(...multipleExports)
        } else if (match[1]) {
          exports.push(match[1])
        }
      }
    }

    const usage = this.fileUsage.get(filePath)
    if (usage) {
      usage.exports = exports
    }
  }

  resolveImportPath(fromFile, importPath) {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolvedPath = path.resolve(path.dirname(fromFile), importPath)
      return this.findExistingFile(resolvedPath)
    }
    
    // Handle absolute imports starting with @/
    if (importPath.startsWith('@/')) {
      const relativePath = importPath.substring(2)
      const resolvedPath = path.resolve(this.projectRoot, relativePath)
      return this.findExistingFile(resolvedPath)
    }
    
    return null
  }

  findExistingFile(basePath) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    // Try exact path
    for (const ext of extensions) {
      const fullPath = basePath + ext
      if (this.allFiles.includes(fullPath)) {
        return fullPath
      }
    }
    
    // Try index files
    for (const ext of extensions) {
      const indexPath = path.join(basePath, 'index' + ext)
      if (this.allFiles.includes(indexPath)) {
        return indexPath
      }
    }
    
    return null
  }

  async identifyUnusedFiles() {
    for (const [filePath, usage] of this.fileUsage.entries()) {
      if (!usage.isUsed && !this.isSpecialFile(filePath)) {
        try {
          const stat = fs.statSync(filePath)
          const relativePath = path.relative(this.projectRoot, filePath)
          
          this.unusedFiles.push({
            path: relativePath,
            size: stat.size,
            reason: this.getUnusedReason(usage)
          })
        } catch (error) {
          // Skip files that can't be accessed
          continue
        }
      }
    }
    
    // Sort by size (largest first)
    this.unusedFiles.sort((a, b) => b.size - a.size)
  }

  isSpecialFile(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath)
    const normalizedPath = relativePath.replace(/\\/g, '/')
    
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
    
    return specialPatterns.some(pattern => pattern.test(normalizedPath))
  }

  getUnusedReason(usage) {
    if (usage.importedBy.length === 0) {
      return 'לא מיובא על ידי אף קובץ'
    }
    if (usage.exports.length === 0) {
      return 'לא מייצא שום דבר'
    }
    return 'לא בשימוש'
  }
}

// Main execution
async function main() {
  const finder = new UnusedFileFinder(process.cwd())
  const unusedFiles = await finder.findUnusedFiles()
  
  console.log('\n📋 דוח קבצים לא בשימוש:')
  console.log('='.repeat(50))
  
  if (unusedFiles.length === 0) {
    console.log('✅ לא נמצאו קבצים לא בשימוש!')
    return
  }
  
  let totalSize = 0
  unusedFiles.forEach((file, index) => {
    const sizeKB = (file.size / 1024).toFixed(1)
    console.log(`${index + 1}. ${file.path}`)
    console.log(`   📏 גודל: ${sizeKB}KB`)
    console.log(`   💭 סיבה: ${file.reason}`)
    console.log('')
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
    files: unusedFiles
  }
  
  fs.writeFileSync('unused-files-report.json', JSON.stringify(report, null, 2))
  console.log('\n📄 הדוח נשמר ב: unused-files-report.json')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { UnusedFileFinder } 