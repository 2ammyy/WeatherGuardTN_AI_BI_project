$ErrorActionPreference = "Stop"

# Step 1: Login as admin to Superset to get access token
$loginBody = @{
    username = "admin"
    password = "admin123"
    provider = "db"
    refresh = $true
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/security/login" -Method Post `
    -ContentType "application/json" -Body $loginBody
$accessToken = $loginResp.access_token
Write-Host "Logged in, access token: $($accessToken.Substring(0, [Math]::Min(30, $accessToken.Length)))..."

# Step 2: Get CSRF token
$csrfResp = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/security/csrf_token" -Method Get `
    -Headers @{"Authorization" = "Bearer $accessToken"; "Referer" = "http://localhost:8088/"}
$csrfToken = $csrfResp.result
Write-Host "CSRF token: $csrfToken"

# Step 3: Get guest token
$guestBody = @{
    user = @{username = "guest"}
    resources = @(@{type = "dashboard"; id = "2"})
    rls = @()
} | ConvertTo-Json

$guestResp = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/security/guest_token/" -Method Post `
    -ContentType "application/json" -Body $guestBody `
    -Headers @{
        "X-CSRFToken" = $csrfToken
        "Referer" = "http://localhost:8001"
    }
$guestToken = $guestResp.token
Write-Host "Guest token: $($guestToken.Substring(0, [Math]::Min(50, $guestToken.Length)))..."

# Step 4: Test charts via explore_json with dashboard_id=2
$chartIds = @(46, 47, 49, 50, 51, 52)
foreach ($sliceId in $chartIds) {
    Write-Host "`n--- Testing chart $sliceId ---"
    
    if ($sliceId -in @(46, 47)) {
        # Line charts - use explore_json
        $urlFd = @{slice_id = $sliceId} | ConvertTo-Json -Compress
        $bodyFormData = @{slice_id = $sliceId; viz_type = "line"} | ConvertTo-Json -Compress
        $url = "http://localhost:8088/superset/explore_json/?form_data=$([System.Web.HttpUtility]::UrlEncode($urlFd))&dashboard_id=2&force=1"
        
        try {
            $resp = Invoke-RestMethod -Uri $url -Method Post `
                -Headers @{"X-GuestToken" = $guestToken; "Referer" = "http://localhost:8001"} `
                -Body @{form_data = $bodyFormData}
            Write-Host "  Status: OK"
        } catch {
            Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)"
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $reader.BaseStream.Position = 0
                $reader.DiscardBufferedData()
                $body = $reader.ReadToEnd()
                Write-Host "  Body: $body"
            } catch {}
        }
    } else {
        # Big number charts - use /api/v1/chart/data
        # Get the chart's datasource ID from the chart list
        $chartResp = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/chart/$sliceId" -Method Get `
            -Headers @{"X-GuestToken" = $guestToken; "Referer" = "http://localhost:8001"}
        $datasourceId = $chartResp.result.datasource_id
        $datasourceType = $chartResp.result.datasource_type
        Write-Host "  Datasource: ${datasourceType}_$datasourceId"
        
        # Build a minimal query context (flat format)
        $payload = @{
            datasource = @{id = $datasourceId; type = $datasourceType}
            queries = @(@{
                granularity = "day"
            })
            result_type = "full"
            result_format = "json"
        }
        
        $url = "http://localhost:8088/api/v1/chart/data?dashboard_id=2"
        
        try {
            $resp = Invoke-RestMethod -Uri $url -Method Post `
                -Headers @{
                    "X-GuestToken" = $guestToken
                    "Content-Type" = "application/json"
                    "Referer" = "http://localhost:8001"
                } -Body ($payload | ConvertTo-Json -Depth 10 -Compress)
            Write-Host "  Status: OK"
        } catch {
            Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)"
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $reader.BaseStream.Position = 0
                $reader.DiscardBufferedData()
                $body = $reader.ReadToEnd()
                Write-Host "  Body: $body"
            } catch {}
        }
    }
}
