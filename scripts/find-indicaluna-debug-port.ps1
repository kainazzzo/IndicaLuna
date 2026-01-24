$processes = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "com.datti.indicaluna.sdPlugin" }

if (-not $processes) {
    Write-Host "No IndicaLuna plugin process found." -ForegroundColor Yellow
    exit 1
}

foreach ($proc in $processes) {
    $cmd = $proc.CommandLine
    if ($cmd -match "--inspect=([^\s]+)") {
        $inspectTarget = $matches[1]
        $port = $inspectTarget.Split(':')[-1]
        Write-Host "PID: $($proc.ProcessId)" -ForegroundColor Cyan
        Write-Host "Inspector: $inspectTarget" -ForegroundColor Cyan
        Write-Host "Port: $port" -ForegroundColor Green
        exit 0
    }
}

Write-Host "IndicaLuna process found, but no --inspect port detected." -ForegroundColor Yellow
exit 1
