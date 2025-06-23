# Test script for Professional Management - Comprehensive Testing
# Tests all professional management functionalities

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AdminEmail = "admin@masu.test",
    [string]$AdminPassword = "123456"
)

# Enable verbose output
$VerbosePreference = "Continue"

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Success,
        [string]$Details = ""
    )
    
    $status = if ($Success) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$status - $TestName" -ForegroundColor $(if ($Success) { "Green" } else { "Red" })
    if ($Details) {
        Write-Host "    Details: $Details" -ForegroundColor Gray
    }
}

function Test-EndpointAccess {
    param(
        [string]$Url,
        [string]$Description,
        [hashtable]$Headers = @{}
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -Headers $Headers -WebSession $global:session
        $success = $response.StatusCode -eq 200
        Write-TestResult "$Description - Access Test" $success "Status: $($response.StatusCode)"
        return $success
    } catch {
        Write-TestResult "$Description - Access Test" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-CreateProfessional {
    param(
        [string]$Name,
        [string]$Email,
        [string]$Phone
    )
    
    try {
        $formData = @{
            name = $Name
            email = $Email
            phone = $Phone
            gender = "female"
            birthDate = "1990-01-01"
        }
        
        Write-Host "Creating professional with data: $($formData | ConvertTo-Json)" -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri "$BaseUrl/dashboard/admin/professional-management/new" -Method POST -Body $formData -WebSession $global:session
        
        $success = $response.StatusCode -in @(200, 302)
        Write-TestResult "Create Professional - $Name" $success "Status: $($response.StatusCode)"
        
        if ($success) {
            # Store the created professional for later tests
            $global:createdProfessionals += @{
                name = $Name
                email = $Email
                phone = $Phone
            }
        }
        
        return $success
    } catch {
        Write-TestResult "Create Professional - $Name" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-ProfessionalsList {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/dashboard/admin/professional-management" -Method GET -WebSession $global:session
        
        $success = $response.StatusCode -eq 200
        $containsTable = $response.Content -like "*table*" -or $response.Content -like "*professional*"
        
        Write-TestResult "Professional List Display" ($success -and $containsTable) "Status: $($response.StatusCode), Contains table: $containsTable"
        return $success -and $containsTable
    } catch {
        Write-TestResult "Professional List Display" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-ProfessionalSearch {
    param([string]$SearchTerm)
    
    try {
        $searchUrl = "$BaseUrl/dashboard/admin/professional-management?search=$SearchTerm"
        $response = Invoke-WebRequest -Uri $searchUrl -Method GET -WebSession $global:session
        
        $success = $response.StatusCode -eq 200
        Write-TestResult "Professional Search - '$SearchTerm'" $success "Status: $($response.StatusCode)"
        return $success
    } catch {
        Write-TestResult "Professional Search - '$SearchTerm'" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-AuthAndSession {
    try {
        # Login
        $loginData = @{
            email = $AdminEmail
            password = $AdminPassword
        }
        
        Write-Host "Attempting admin login..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -Body $loginData -SessionVariable webSession
        
        $global:session = $webSession
        
        $success = $response.StatusCode -in @(200, 302)
        Write-TestResult "Admin Authentication" $success "Status: $($response.StatusCode)"
        
        return $success
    } catch {
        Write-TestResult "Admin Authentication" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-APIEndpoints {
    $apiTests = @(
        @{ Url = "$BaseUrl/api/treatments"; Description = "Treatments API" },
        @{ Url = "$BaseUrl/api/cities"; Description = "Cities API" }
    )
    
    $allPassed = $true
    foreach ($test in $apiTests) {
        $passed = Test-EndpointAccess -Url $test.Url -Description $test.Description
        $allPassed = $allPassed -and $passed
    }
    
    return $allPassed
}

function Test-DatabaseConnection {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/init" -Method GET -WebSession $global:session
        $success = $response.StatusCode -eq 200
        Write-TestResult "Database Connection" $success "Status: $($response.StatusCode)"
        return $success
    } catch {
        Write-TestResult "Database Connection" $false "Error: $($_.Exception.Message)"
        return $false
    }
}

# Main test execution
Write-Host "Starting Comprehensive Professional Management Testing" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Admin Email: $AdminEmail" -ForegroundColor Gray
Write-Host ""

# Initialize global variables
$global:session = $null
$global:createdProfessionals = @()
$testResults = @()

# Test 1: Authentication
Write-Host "`n[Test 1] Authentication and Session" -ForegroundColor Blue
$authSuccess = Test-AuthAndSession
$testResults += @{ Name = "Authentication"; Success = $authSuccess }

if (-not $authSuccess) {
    Write-Host "Authentication failed. Cannot proceed with other tests." -ForegroundColor Red
    exit 1
}

# Test 2: Database Connection
Write-Host "`n[Test 2] Database Connection" -ForegroundColor Blue
$dbSuccess = Test-DatabaseConnection
$testResults += @{ Name = "Database Connection"; Success = $dbSuccess }

# Test 3: API Endpoints
Write-Host "`n[Test 3] API Endpoints" -ForegroundColor Blue
$apiSuccess = Test-APIEndpoints
$testResults += @{ Name = "API Endpoints"; Success = $apiSuccess }

# Test 4: Professional Management Pages
Write-Host "`n[Test 4] Professional Management Pages" -ForegroundColor Blue
$pageTests = @(
    @{ Url = "$BaseUrl/dashboard/admin/professional-management"; Description = "Main Professional Management Page" },
    @{ Url = "$BaseUrl/dashboard/admin/professional-management/new"; Description = "New Professional Page" }
)

$pagesSuccess = $true
foreach ($test in $pageTests) {
    $passed = Test-EndpointAccess -Url $test.Url -Description $test.Description
    $pagesSuccess = $pagesSuccess -and $passed
}
$testResults += @{ Name = "Professional Management Pages"; Success = $pagesSuccess }

# Test 5: Professional List Display
Write-Host "`n[Test 5] Professional List Functionality" -ForegroundColor Blue
$listSuccess = Test-ProfessionalsList
$testResults += @{ Name = "Professional List"; Success = $listSuccess }

# Test 6: Professional Creation
Write-Host "`n[Test 6] Professional Creation" -ForegroundColor Blue
$creationTests = @(
    @{ Name = "Dr. Sarah Cohen"; Email = "sarah.cohen+$(Get-Random)@test.masu"; Phone = "+97250$(Get-Random -Min 1000000 -Max 9999999)" },
    @{ Name = "Dr. Michael Levy"; Email = "michael.levy+$(Get-Random)@test.masu"; Phone = "+97250$(Get-Random -Min 1000000 -Max 9999999)" },
    @{ Name = "Dr. Rachel David"; Email = "rachel.david+$(Get-Random)@test.masu"; Phone = "+97250$(Get-Random -Min 1000000 -Max 9999999)" }
)

$creationSuccess = $true
foreach ($test in $creationTests) {
    $passed = Test-CreateProfessional -Name $test.Name -Email $test.Email -Phone $test.Phone
    $creationSuccess = $creationSuccess -and $passed
    Start-Sleep -Seconds 2  # Prevent rate limiting
}
$testResults += @{ Name = "Professional Creation"; Success = $creationSuccess }

# Test 7: Search Functionality
Write-Host "`n[Test 7] Search Functionality" -ForegroundColor Blue
$searchTerms = @("Sarah", "Dr.", "test.masu")
$searchSuccess = $true
foreach ($term in $searchTerms) {
    $passed = Test-ProfessionalSearch -SearchTerm $term
    $searchSuccess = $searchSuccess -and $passed
}
$testResults += @{ Name = "Search Functionality"; Success = $searchSuccess }

# Test 8: Professional List After Creation
Write-Host "`n[Test 8] Professional List After Creation" -ForegroundColor Blue
$finalListSuccess = Test-ProfessionalsList
$testResults += @{ Name = "Final Professional List"; Success = $finalListSuccess }

# Results Summary
Write-Host "`nTest Results Summary" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Success }).Count
$failedTests = $totalTests - $passedTests

foreach ($result in $testResults) {
    $status = if ($result.Success) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$status - $($result.Name)" -ForegroundColor $(if ($result.Success) { "Green" } else { "Red" })
}

Write-Host "`nOverall Results:" -ForegroundColor White
Write-Host "  Total Tests: $totalTests" -ForegroundColor Gray
Write-Host "  Passed: $passedTests" -ForegroundColor Green
Write-Host "  Failed: $failedTests" -ForegroundColor Red
Write-Host "  Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 1))%" -ForegroundColor Yellow

if ($failedTests -eq 0) {
    Write-Host "`nAll tests passed! Professional Management is working correctly." -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed. Please check the issues above." -ForegroundColor Yellow
}

Write-Host "`nCreated Professionals for testing:" -ForegroundColor Cyan
foreach ($prof in $global:createdProfessionals) {
    Write-Host "  - $($prof.name) ($($prof.email))" -ForegroundColor Gray
}

exit $(if ($failedTests -eq 0) { 0 } else { 1 }) 