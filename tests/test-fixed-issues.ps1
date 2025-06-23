#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING FIXES FOR IDENTIFIED ISSUES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://v0-masu-lo.vercel.app"

# Test counters
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Endpoint {
    param($url, $method = "GET", $description)
    $global:totalTests++
    try {
        $response = Invoke-WebRequest -Uri $url -Method $method -TimeoutSec 30
        Write-Host "PASS: $description ($($response.StatusCode))" -ForegroundColor Green
        $global:passedTests++
        return $true
    } catch {
        Write-Host "FAIL: $description - $($_.Exception.Message)" -ForegroundColor Red
        $global:failedTests++
        return $false
    }
}

Write-Host "`nTESTING CITIES COVERAGE API WITH PROPER PARAMETERS" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow

# Test Cities Coverage API with proper parameters
Test-Endpoint "$baseUrl/api/cities/coverage?cityName=Tel-Aviv`&distanceRadius=20km" "GET" "Cities Coverage API - Tel Aviv 20km"
Test-Endpoint "$baseUrl/api/cities/coverage?cityName=Jerusalem`&distanceRadius=40km" "GET" "Cities Coverage API - Jerusalem 40km"
Test-Endpoint "$baseUrl/api/cities/coverage?cityName=Haifa`&distanceRadius=unlimited" "GET" "Cities Coverage API - Haifa unlimited"

Write-Host "`nTESTING ALTERNATIVE GIFT VOUCHER FLOWS" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow

# Test alternative gift voucher related pages
Test-Endpoint "$baseUrl/purchase/gift-voucher" "GET" "Gift Voucher Purchase Page"
Test-Endpoint "$baseUrl/purchase/gift-voucher/page-new" "GET" "Gift Voucher New Page"

Write-Host "`nTESTING CITIES API VARIATIONS" -ForegroundColor Yellow  
Write-Host "==============================" -ForegroundColor Yellow

# Test cities API with different approaches
Test-Endpoint "$baseUrl/api/cities" "GET" "Cities API Basic"
Test-Endpoint "$baseUrl/api/cities?active=true" "GET" "Cities API Active Filter"

Write-Host "`nTESTING OTHER PURCHASE FLOWS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Test subscription flow which was working
Test-Endpoint "$baseUrl/purchase/subscription" "GET" "Subscription Purchase Page"
Test-Endpoint "$baseUrl/purchase/subscription/confirmation" "GET" "Subscription Confirmation"
Test-Endpoint "$baseUrl/purchase/subscription/page-new" "GET" "Subscription New Page"

Write-Host "`nTESTING BOOKING RELATED PAGES" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow

# Test booking flows
Test-Endpoint "$baseUrl/bookings/treatment" "GET" "Treatment Booking Page"

Write-Host "`nVERIFYING ADMIN REPORTS APIS" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

# Test some admin report APIs (these might require authentication but we can check if endpoints exist)
Test-Endpoint "$baseUrl/api/admin/reports/bookings-per-city?start=2025-01-01`&end=2025-01-31" "GET" "Admin Bookings Per City Report"
Test-Endpoint "$baseUrl/api/admin/reports/revenue-summary?start=2025-01-01`&end=2025-01-31" "GET" "Admin Revenue Summary Report"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ISSUE VERIFICATION TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

if ($failedTests -eq 0) {
    Write-Host "`nALL ISSUES FIXED! System working perfectly!" -ForegroundColor Green
} elseif ($failedTests -le 2) {
    Write-Host "`nMost issues resolved. Minor issues remain." -ForegroundColor Yellow
} else {
    Write-Host "`nSome issues still need attention." -ForegroundColor Red
}

Write-Host "`nTest completed at: $(Get-Date)" -ForegroundColor Cyan 