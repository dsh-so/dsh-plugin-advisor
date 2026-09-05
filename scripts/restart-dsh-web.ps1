# restart-dsh-web.ps1 - 延时结束并重启 dsh web（端口 3080）
# 用法: pwsh -File restart-dsh-web.ps1 [-DelaySeconds 5]
param([int]$DelaySeconds = 5)

$port = 3080
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $conn) { Write-Output "NO_LISTENER_ON_$port"; exit 1 }

$pids = ($conn | Select-Object -ExpandProperty OwningProcess -Unique) -join ','
Write-Output ("SCHEDULED: kill [" + $pids + "] in " + $DelaySeconds + "s, then restart 'dsh web'")

$inner = @'
Start-Sleep -Seconds DELAY_SEC
Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c','dsh web'
'@
$inner = $inner.Replace('DELAY_SEC', [string]$DelaySeconds)
$tmp = Join-Path $env:TEMP 'dsh-restart-web-inner.ps1'
Set-Content -Path $tmp -Value $inner -Encoding UTF8
Start-Process -WindowStyle Hidden -FilePath 'pwsh' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File', $tmp
Write-Output 'RESTART_SCHEDULED'
