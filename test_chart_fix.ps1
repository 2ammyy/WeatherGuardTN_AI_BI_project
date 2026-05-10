$ErrorActionPreference = "Stop"

# Get guest token from backend
$guestResp = Invoke-RestMethod -Method Get -Uri "http://localhost:8001/api/admin/superset/guest-token" -Headers @{"Referer"="http://localhost:8001/superset-dashboard"}
Write-Host "Guest token response: embedded_uuid=$($guestResp.embedded_uuid)"

# Get guest token from Superset
$resp = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/security/guest_token/" -Method Post -Headers @{
    "Content-Type"="application/json"
    "Referer"="http://localhost:8001"
} -Body (@{
    user = @{username="guest"}
    resources = @(@{type="dashboard";id="2"})
    rls = @()
} | ConvertTo-Json)
$token = $resp.token
Write-Host "Got token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."

# Test chart 46 via explore_json
Write-Host "`n--- Test chart 46 (line) via explore_json ---"
$body46 = @{
    form_data = @{
        slice_id = 46
        viz_type = "line"
        datasource = "6__table"
        granularity_sqla = "reg_date"
        time_grain_sqla = "P1D"
        groupby = @("reg_date")
        metrics = @(@{expressionType="SIMPLE"; column=@{column_name="new_users"}; aggregate="SUM"; label="New Users"})
        adhoc_filters = @()
        row_limit = 100
    }
}
$jsonBody46 = $body46 | ConvertTo-Json -Compress

try {
    $resp46 = Invoke-RestMethod -Uri "http://localhost:8088/superset/explore_json/?form_data=%7B%22slice_id%22%3A46%7D&force=1" -Method Post -Headers @{
        "X-GuestToken" = $token
        "Referer" = "http://localhost:8001"
    } -Body @{form_data = $jsonBody46}
    Write-Host "Chart 46: OK - $($resp46 | ConvertTo-Json -Compress)"
} catch {
    Write-Host "Chart 46 error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host "Response body: $($reader.ReadToEnd())"
    }
}

# Test chart 49 via /api/v1/chart/data
Write-Host "`n--- Test chart 49 (big_number) via /api/v1/chart/data ---"
$payload49 = @{
    datasource = @{id=5; type="table"}
    queries = @(@{
        granularity = "day"
        metrics = @(@{expressionType="SIMPLE"; column=@{column_name="total_users"}; aggregate="SUM"; label="Total Users"})
    })
    result_type = "full"
    result_format = "json"
}
$jsonPayload49 = $payload49 | ConvertTo-Json -Compress

try {
    $resp49 = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/chart/data" -Method Post -Headers @{
        "X-GuestToken" = $token
        "Content-Type" = "application/json"
        "Referer" = "http://localhost:8001"
    } -Body $jsonPayload49
    Write-Host "Chart 49: OK"
    Write-Host "Result: $($resp49 | ConvertTo-Json -Compress)"
} catch {
    Write-Host "Chart 49 error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host "Response body: $($reader.ReadToEnd())"
    }
}

# Test chart 49 with buildV1ChartDataPayload-style payload (flat format)
Write-Host "`n--- Test chart 49 with flat payload (no query_context wrapper) ---"
$flatPayload = @{
    datasource = @{id=5; type="table"}
    queries = @(@{
        granularity = "day"
        metrics = @(@{expressionType="SIMPLE"; column=@{column_name="total_users"}; aggregate="SUM"; label="Total Users"})
    })
    force = $false
    result_type = "full"
    result_format = "json"
}
try {
    $respFlat = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/chart/data" -Method Post -Headers @{
        "X-GuestToken" = $token
        "Content-Type" = "application/json"
        "Referer" = "http://localhost:8001"
    } -Body ($flatPayload | ConvertTo-Json -Compress)
    Write-Host "Flat payload: OK"
} catch {
    Write-Host "Flat payload error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host "Response body: $($reader.ReadToEnd())"
    }
}
