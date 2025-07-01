# PowerShell script to safely delete specific unused imports
# This script is more precise to avoid breaking import syntax

Write-Host "Starting safe unused import cleanup..." -ForegroundColor Green

# Function to safely remove specific imports from import lines
function Remove-UnusedImportsSafe {
    param(
        [string]$FilePath,
        [string[]]$UnusedImports
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
        return
    }
    
    $content = Get-Content $FilePath -Raw
    $modified = $false
    
    foreach ($unusedImport in $UnusedImports) {
        # Pattern 1: Remove import from destructured imports (handle commas carefully)
        # Remove "ImportName, " (import followed by comma and space)
        if ($content -match "\b$unusedImport\b,\s+") {
            $content = $content -replace "\b$unusedImport\b,\s+", ""
            $modified = $true
        }
        # Remove ", ImportName" (comma, space, then import)
        elseif ($content -match ",\s+\b$unusedImport\b") {
            $content = $content -replace ",\s+\b$unusedImport\b", ""
            $modified = $true
        }
        # Remove single import in braces "{ ImportName }"
        elseif ($content -match "import\s*\{\s*\b$unusedImport\b\s*\}\s*from") {
            $content = $content -replace "import\s*\{\s*\b$unusedImport\b\s*\}\s*from[^;]*;?\s*\n?", ""
            $modified = $true
        }
    }
    
    if ($modified) {
        $content | Set-Content $FilePath -Encoding UTF8
        Write-Host "Updated: $FilePath" -ForegroundColor Yellow
    }
}

Write-Host "Processing files with safe method..." -ForegroundColor Cyan

# Process only the most critical unused imports that are safe to remove
Remove-UnusedImportsSafe "components/booking/guest-booking-wizard.tsx" @("format", "toZonedTime")
Remove-UnusedImportsSafe "components/booking/member-redemption-modal.tsx" @("Link")
Remove-UnusedImportsSafe "components/booking/steps/guest-booking-confirmation.tsx" @("CardDescription")
Remove-UnusedImportsSafe "components/booking/steps/guest-payment-step.tsx" @("Badge")
Remove-UnusedImportsSafe "components/booking/steps/guest-scheduling-step.tsx" @("useState")
Remove-UnusedImportsSafe "components/booking/steps/guest-summary-step.tsx" @("useState")
Remove-UnusedImportsSafe "components/auth/forgot-password/forgot-password-form.tsx" @("Phone")
Remove-UnusedImportsSafe "components/dashboard/admin/bookings/admin-bookings-client.tsx" @("Heading")
Remove-UnusedImportsSafe "components/dashboard/admin/bookings/booking-create-page.tsx" @("CardTitle", "ArrowRight")
Remove-UnusedImportsSafe "app/dashboard/(user)/(roles)/admin/partners/page.tsx" @("CardTitle")
Remove-UnusedImportsSafe "app/dashboard/(user)/(roles)/admin/professional-management/page.tsx" @("CardTitle")
Remove-UnusedImportsSafe "app/dashboard/(user)/(roles)/admin/users/page.tsx" @("UserCheck", "UserX", "Shield")

Write-Host "Safe unused import cleanup completed!" -ForegroundColor Green
Write-Host "Run 'npm run lint' to see the reduced error count." -ForegroundColor Cyan
