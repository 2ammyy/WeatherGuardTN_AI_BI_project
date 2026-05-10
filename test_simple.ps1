$ErrorActionPreference = "Stop"
$body = @{username='admin'; password='admin123'; provider='db'; refresh=$true} | ConvertTo-Json
$r = Invoke-RestMethod -Uri 'http://localhost:8088/api/v1/security/login' -Method Post -ContentType 'application/json' -Body $body
$tok = $r.access_token

$r2 = Invoke-RestMethod -Uri 'http://localhost:8088/api/v1/security/csrf_token/' -Method Get -Headers @{'Authorization'=('Bearer '+$tok); 'Referer'='http://localhost:8088/'}
$csrf = $r2.result

$gbody = @{user=@{username='guest'}; resources=@(@{type='dashboard'; id='2'}); rls=@()} | ConvertTo-Json
$gr = Invoke-RestMethod -Uri 'http://localhost:8088/api/v1/security/guest_token/' -Method Post -ContentType 'application/json' -Body $gbody -Headers @{'X-CSRFToken'=$csrf; 'Referer'='http://localhost:8001'}
$gtok = $gr.token
Write-Host 'Token obtained'

$payload = '{"datasource":{"id":5,"type":"table"},"queries":[{"granularity":"day"}],"result_type":"full","result_format":"json"}'
try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:8088/api/v1/chart/data' -Method Post -Headers @{'X-GuestToken'=$gtok; 'Content-Type'='application/json'; 'Referer'='http://localhost:8001'} -Body $payload
    Write-Host 'CHART DATA OK'
} catch {
    Write-Host ('ERROR: '+$_.Exception.Response.StatusCode.value__)
    $s = $_.Exception.Response.GetResponseStream()
    $r = New-Object System.IO.StreamReader($s)
    Write-Host ('BODY: '+$r.ReadToEnd())
}
