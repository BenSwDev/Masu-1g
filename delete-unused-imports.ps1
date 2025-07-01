# PowerShell script to delete unused imports from specific files
# This script removes only the unused imports identified in the linting analysis

Write-Host "Starting unused import cleanup..." -ForegroundColor Green

# Function to remove specific imports from a line
function Remove-UnusedImports {
    param(
        [string]$FilePath,
        [string[]]$UnusedImports
    )
    
    if (Test-Path $FilePath) {
        $lines = Get-Content $FilePath
        $modified = $false
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            
            # Check if this line contains imports
            if ($line -match "import.*from") {
                $originalLine = $line
                
                # Remove each unused import from the line
                foreach ($unusedImport in $UnusedImports) {
                    # Handle different import patterns
                    $line = $line -replace "\b$unusedImport\b,\s*", ""
                    $line = $line -replace ",\s*\b$unusedImport\b", ""
                    $line = $line -replace "\{\s*\b$unusedImport\b\s*\}", ""
                    $line = $line -replace "\b$unusedImport\b", ""
                }
                
                # Clean up any resulting empty braces or extra commas
                $line = $line -replace "\{\s*,", "{"
                $line = $line -replace ",\s*\}", "}"
                $line = $line -replace "\{\s*\}", ""
                $line = $line -replace ",\s*,", ","
                $line = $line -replace "import\s*\{\s*\}\s*from.*", ""
                
                # If line is now empty or just whitespace, mark for removal
                if ($line -match "^\s*import\s*\{\s*\}\s*from" -or $line -match "^\s*$") {
                    $lines[$i] = $null
                    $modified = $true
                } elseif ($line -ne $originalLine) {
                    $lines[$i] = $line
                    $modified = $true
                }
            }
        }
        
        if ($modified) {
            # Remove null lines and write back
            $filteredLines = $lines | Where-Object { $_ -ne $null }
            $filteredLines | Set-Content $FilePath -Encoding UTF8
            Write-Host "Updated: $FilePath" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $FilePath" -ForegroundColor Red
    }
}

Write-Host "Processing files..." -ForegroundColor Cyan

# Process each file with its unused imports
Remove-UnusedImports "app/(orders)/purchase/gift-voucher/actions.ts" @("ITreatment")
Remove-UnusedImports "app/(orders)/purchase/gift-voucher/simplified-gift-voucher-wizard.tsx" @("Badge", "DollarSign", "Gift", "User", "CreditCard")
Remove-UnusedImports "app/(orders)/purchase/subscription/actions.ts" @("ISubscription", "ITreatment")
Remove-UnusedImports "app/(orders)/purchase/subscription/confirmation/page.tsx" @("getUserSubscriptionById", "Subscription", "Treatment")
Remove-UnusedImports "app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx" @("Button", "Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue", "Separator", "Package", "Clock", "Star", "CreditCard", "CheckCircle", "User", "Mail", "Phone", "purchaseGuestSubscription", "GuestSubscriptionConfirmation")
Remove-UnusedImports "app/api/admin/bookings/potential/route.ts" @("User")
Remove-UnusedImports "app/api/admin/bookings/[bookingId]/assign/route.ts" @("User")
Remove-UnusedImports "app/api/bookings/create/route.ts" @("ITreatment", "IUserSubscription", "IGiftVoucher")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/bookings/actions.ts" @("IUser", "Review", "IReview", "IPaymentMethod", "unifiedNotificationService", "NotificationRecipient")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/bookings/[bookingId]/page.tsx" @("CardHeader", "CardTitle")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/cities/actions.ts" @("BookingStatus")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/coupons/actions.ts" @("revalidatePath", "Types")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/customers/actions.ts" @("revalidatePath")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/gift-vouchers/actions.ts" @("revalidatePath", "IUser", "ITreatment")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/gift-vouchers/page.tsx" @("GiftVoucher")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/partner-coupon-batches/actions.ts" @("BookingStatus")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/partners/actions.ts" @("User")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/partners/page.tsx" @("CardTitle")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/professional-management/page.tsx" @("CardTitle")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/reviews/actions.ts" @("IReview", "Booking")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/subscriptions/actions.ts" @("BookingStatus")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/treatments/actions.ts" @("BookingStatus")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/user-subscriptions/actions.ts" @("BookingStatus", "PaymentMethod")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/users/actions.ts" @("IUser", "UserRole", "Types")
Remove-UnusedImports "app/dashboard/(user)/(roles)/admin/users/page.tsx" @("UserCheck", "UserX", "Shield")
Remove-UnusedImports "app/dashboard/(user)/(roles)/member/addresses/page.tsx" @("getServerSession", "authOptions", "redirect", "AddressesClient")
Remove-UnusedImports "components/auth/forgot-password/forgot-password-form.tsx" @("Phone")
Remove-UnusedImports "components/auth/login/login-form.tsx" @("useRef", "useEffect", "Mail", "Phone", "LoginMethod")
Remove-UnusedImports "components/booking/guest-booking-wizard.tsx" @("format", "toZonedTime")
Remove-UnusedImports "components/booking/member-redemption-modal.tsx" @("Link")
Remove-UnusedImports "components/booking/steps/guest-booking-confirmation.tsx" @("CardDescription")
Remove-UnusedImports "components/booking/steps/guest-payment-step.tsx" @("Badge")
Remove-UnusedImports "components/booking/steps/guest-scheduling-step.tsx" @("useState")
Remove-UnusedImports "components/booking/steps/guest-summary-step.tsx" @("useState")
Remove-UnusedImports "components/common/purchase/purchase-filters.tsx" @("Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue")
Remove-UnusedImports "components/common/purchase/purchase-history-table.tsx" @("CardDescription", "CardHeader", "CardTitle", "Clock", "MapPin", "CheckCircle", "XCircle", "AlertCircle")
Remove-UnusedImports "components/dashboard/admin/booking-logs-viewer.tsx" @("Tabs", "TabsContent", "TabsList", "TabsTrigger", "Separator", "Clock", "Filter")
Remove-UnusedImports "components/dashboard/admin/bookings/admin-bookings-client.tsx" @("Heading")
Remove-UnusedImports "components/dashboard/admin/bookings/admin-bookings-columns.tsx" @("cn", "useMemo", "useEffect")
Remove-UnusedImports "components/dashboard/admin/bookings/booking-create-page.tsx" @("CardTitle", "ArrowRight")
Remove-UnusedImports "components/dashboard/admin/bookings/enhanced-booking-modal.tsx" @("MapPin", "CreditCard", "Star", "Building", "Truck", "Ticket", "Shield", "Home", "Hotel", "Car")
Remove-UnusedImports "components/dashboard/admin/bookings/tabs/booking-address-tab.tsx" @("Navigation")
Remove-UnusedImports "components/dashboard/admin/bookings/tabs/booking-details-tab.tsx" @("Input", "Save")
Remove-UnusedImports "components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx" @("useState", "CreditCard", "XCircle")
Remove-UnusedImports "components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx" @("useState", "CheckCircle", "XCircle", "Clock")
Remove-UnusedImports "components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx" @("Edit", "Users")

Write-Host "Unused import cleanup completed!" -ForegroundColor Green
Write-Host "Run 'npm run lint' to see the reduced error count." -ForegroundColor Cyan
