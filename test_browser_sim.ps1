$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$base = "http://localhost:8088"

# Login
$loginBody = @{username="admin"; password="admin123"; provider="db"; refresh=$true} | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$base/api/v1/security/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResp.access_token

# Get CSRF token
$csrfResp = Invoke-RestMethod -Uri "$base/api/v1/security/csrf_token/" -Method Get -Headers @{"Authorization"="Bearer $token"; "Referer"="$base/"}
$csrf = $csrfResp.result
Write-Host "CSRF: $csrf"

# Create guest token
$guestBody = @{user=@{username="guest"}; resources=@(@{type="dashboard"; id="2"}); rls=@()} | ConvertTo-Json
$guestResp = Invoke-RestMethod -Uri "$base/api/v1/security/guest_token/" -Method Post -ContentType "application/json" -Body $guestBody -Headers @{"Authorization"="Bearer $token"; "X-CSRFToken"=$csrf; "Referer"="$base/"}
$gtoken = $guestResp.token
Write-Host "Guest token obtained"

# Test chart 49 with browser-like URL
$url = "$base/api/v1/chart/data?form_data=$([System.Web.HttpUtility]::UrlEncode('{"slice_id":49}'))&dashboard_id=2&force"
$payload = @{
    datasource = @{id=7; type="table"}
    queries = @(@{
        granularity = "day"
        metrics = @(@{expressionType="SIMPLE"; column=@{column_name="total_users"}; aggregate="SUM"; label="Total Users"})
    })
    force = $false
    result_type = "full"
    result_format = "json"
    form_data = @{
        datasource = "7__table"
        slice_id = 49
        viz_type = "big_number"
        metric = @{expressionType="SIMPLE"; column=@{column_name="total_users"}; aggregate="SUM"; label="Total Users"}
        time_range = "No filter"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $resp = Invoke-RestMethod -Uri $url -Method Post -Headers @{"X-GuestToken"=$gtoken; "Content-Type"="application/json"; "Referer"="http://localhost:8001"} -Body $payload
    Write-Host "Chart 49: OK"
} catch {
    Write-Host "ERROR: $($_.Exception.Response.StatusCode.value__)"
    $s = $_.Exception.Response.GetResponseStream()
    $r = New-Object System.IO.StreamReader($s)
    Write-Host "BODY: $($r.ReadToEnd())"
}
