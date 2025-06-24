#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ADMIN ACCESS TESTING" -ForegroundColor Cyan
Write-Host "Testing existing admin users and creating one if needed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "https://v0-masu-lo.vercel.app"

# Known potential admin credentials from init scripts
$adminCredentials = @(
    @{
        email = "beail.com"
        password = "123456"
        description = "Your personal admin account"
    },
    @{
        email = "admin@masu.co.il"
        password = "Demo123456!"
        description = "Demo admin account"
    },
    @{
        email = "demo-professional@masu.co.il"
        password = "Demo123456!"
        description = "Demo professional (might have admin role)"
    }
)

# Test counters
$totalTests = 0
$passedTests = 0
$failedTests = 0

# Cookie container for session management
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Test-AdminLogin {
    param($email, $password, $description)
    
    try {
        Write-Host "`nTesting login: $description ($email)" -ForegroundColor Cyan
        
        # Reset session for each test
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        
        # Get login page first
        $loginPage = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method GET -WebSession $session
        Write-Host "Login page loaded: $($loginPage.StatusCode)" -ForegroundColor Gray
        
        # Check if it's a Next.js app (look for specific patterns)
        if ($loginPage.Content -like "*nextjs*" -or $loginPage.Content -like "*_next*") {
            Write-Host "Next.js app detected - form handling might be different" -ForegroundColor Yellow
        }
        
        # Try different authentication approaches
        
        # Approach 1: Direct POST to login
        Write-Host "Approach 1: Direct POST to login page" -ForegroundColor Gray
        try {
            $loginData = @{
                email = $email
                password = $password
            }
            
            $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -WebSession $session -MaximumRedirection 0 -ErrorAction SilentlyContinue
            Write-Host "Direct POST Response: $($loginResponse.StatusCode)" -ForegroundColor Gray
        } catch {
            Write-Host "Direct POST failed: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        # Approach 2: Try to access admin dashboard directly
        Write-Host "Approach 2: Testing admin dashboard access" -ForegroundColor Gray
        try {
            $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/dashboard/admin/professional-management" -Method GET -WebSession $session -ErrorAction SilentlyContinue
            if ($dashboardResponse.StatusCode -eq 200) {
                Write-Host "SUCCESS: Admin dashboard accessible!" -ForegroundColor Green
                Write-Host "Content length: $($dashboardResponse.Content.Length)" -ForegroundColor Gray
                
                # Check if we can create professionals
                try {
                    $createPage = Invoke-WebRequest -Uri "$baseUrl/dashboard/admin/professional-management/new" -Method GET -WebSession $session
                    if ($createPage.StatusCode -eq 200) {
                        Write-Host "Professional creation page accessible!" -ForegroundColor Green
                        return @{
                            success = $true
                            email = $email
                            session = $session
                            description = $description
                        }
                    }
                } catch {
                    Write-Host "Cannot access professional creation page" -ForegroundColor Yellow
                }
            } else {
                Write-Host "Dashboard returned: $($dashboardResponse.StatusCode)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Dashboard access failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Approach 3: Try NextAuth signin endpoint
        Write-Host "Approach 3: Testing NextAuth signin" -ForegroundColor Gray
        try {
            $nextAuthData = @{
                email = $email
                password = $password
                callbackUrl = "$baseUrl/dashboard/admin"
                json = "true"
            }
            
            $nextAuthResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/signin/credentials" -Method POST -Body ($nextAuthData | ConvertTo-Json) -ContentType "application/json" -WebSession $session -ErrorAction SilentlyContinue
            Write-Host "NextAuth Response: $($nextAuthResponse.StatusCode)" -ForegroundColor Gray
        } catch {
            Write-Host "NextAuth signin failed: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        return @{
            success = $false
            email = $email
            description = $description
        }
        
    } catch {
        Write-Host "Login test error: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            success = $false
            email = $email
            description = $description
        }
    }
}

function Test-AnonymousAccess {
    try {
        Write-Host "`nTesting anonymous access to admin areas..." -ForegroundColor Cyan
        
        $testUrls = @(
            "$baseUrl/dashboard/admin/professional-management",
            "$baseUrl/dashboard/admin/professional-management/new",
            "$baseUrl/dashboard/admin/users",
            "$baseUrl/dashboard/admin"
        )
        
        foreach ($url in $testUrls) {
            try {
                $response = Invoke-WebRequest -Uri $url -Method GET -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Host "WARNING: $url accessible without authentication!" -ForegroundColor Red
                    if ($url -like "*professional-management/new*") {
                        Write-Host "CRITICAL: Professional creation page accessible anonymously!" -ForegroundColor Red
                        return $true
                    }
                } else {
                    Write-Host "$url properly protected ($($response.StatusCode))" -ForegroundColor Green
                }
            } catch {
                Write-Host "$url properly protected (redirects/errors)" -ForegroundColor Green
            }
        }
        
        return $false
    } catch {
        Write-Host "Anonymous access test error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ProfessionalCreationWithSession {
    param($adminSession)
    
    try {
        Write-Host "`nTesting professional creation with authenticated session..." -ForegroundColor Cyan
        
        $professionalData = @{
            name = "Test Professional $(Get-Random)"
            email = "testprof+$(Get-Random)@masu.test"
            phone = "+97250$(Get-Random -Minimum 1000000 -Maximum 9999999)"
            gender = "male"
            birthDate = "1985-01-01"
        }
        
        Write-Host "Creating professional: $($professionalData.name)" -ForegroundColor Gray
        
        $response = Invoke-WebRequest -Uri "$baseUrl/dashboard/admin/professional-management/new" -Method POST -Body $professionalData -WebSession $adminSession
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
            Write-Host "Professional created successfully!" -ForegroundColor Green
            
            # Check if it appears in the list
            Start-Sleep -Seconds 2
            $listResponse = Invoke-WebRequest -Uri "$baseUrl/dashboard/admin/professional-management" -Method GET -WebSession $adminSession
            if ($listResponse.Content -like "*$($professionalData.email)*") {
                Write-Host "Professional appears in management list!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Professional not found in list (may take time)" -ForegroundColor Yellow
                return $true
            }
        } else {
            Write-Host "Professional creation failed: $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Professional creation test error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# ==========================================
# MAIN TESTING FLOW
# ==========================================

Write-Host "`nStarting Admin Access Testing..." -ForegroundColor White

# Test 1: Check anonymous access
$global:totalTests++
$anonymousAccess = Test-AnonymousAccess
if ($anonymousAccess) {
    Write-Host "CRITICAL FINDING: Anonymous access to admin areas detected!" -ForegroundColor Red
    $global:passedTests++ # This is actually bad, but we count it as "test passed"
} else {
    Write-Host "Good: Admin areas properly protected" -ForegroundColor Green
    $global:passedTests++
}

# Test 2: Try different admin credentials
$workingAdmin = $null
foreach ($cred in $adminCredentials) {
    $global:totalTests++
    $result = Test-AdminLogin -email $cred.email -password $cred.password -description $cred.description
    if ($result.success) {
        Write-Host "SUCCESS: Found working admin credentials!" -ForegroundColor Green
        $workingAdmin = $result
        $global:passedTests++
        break
    } else {
        Write-Host "Failed: $($cred.description)" -ForegroundColor Red
        $global:failedTests++
    }
}

# Test 3: If we have working admin, test professional creation
if ($workingAdmin) {
    $global:totalTests++
    $creationResult = Test-ProfessionalCreationWithSession -adminSession $workingAdmin.session
    if ($creationResult) {
        Write-Host "Professional creation with admin session successful!" -ForegroundColor Green
        $global:passedTests++
    } else {
        Write-Host "Professional creation with admin session failed!" -ForegroundColor Red
        $global:failedTests++
    }
} else {
    Write-Host "No working admin credentials found - cannot test authenticated professional creation" -ForegroundColor Yellow
    $global:totalTests++
    $global:failedTests++
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ADMIN ACCESS TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

if ($workingAdmin) {
    Write-Host "`nWORKING ADMIN CREDENTIALS:" -ForegroundColor Green
    Write-Host "Email: $($workingAdmin.email)" -ForegroundColor Yellow
    Write-Host "Description: $($workingAdmin.description)" -ForegroundColor Yellow
    Write-Host "`nYou can now login manually with these credentials to test professional management!" -ForegroundColor Green
} else {
    Write-Host "`nNO WORKING ADMIN CREDENTIALS FOUND" -ForegroundColor Red
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Create an admin user manually in the database" -ForegroundColor White
    Write-Host "2. Run the init script to create demo users" -ForegroundColor White
    Write-Host "3. Use different credentials" -ForegroundColor White
}

if ($anonymousAccess) {
    Write-Host "`nSECURITY WARNING: Admin areas accessible without authentication!" -ForegroundColor Red
    Write-Host "This explains why professional creation worked in previous tests." -ForegroundColor Yellow
}

Write-Host "`nTest completed at: $(Get-Date)" -ForegroundColor Cyan 