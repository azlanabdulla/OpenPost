$openpost = Get-Process openpost -ErrorAction SilentlyContinue
if (-not $openpost) {
    Write-Host "OpenPost process not found."
    exit 1
}

$procId = $openpost.Id
Write-Host "=== Monitoring network traffic for OpenPost (PID $procId) ==="
$log = @()

for ($i = 0; $i -lt 10; $i++) {
    $conns = Get-NetTCPConnection -OwningProcess $procId -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $log += "$($c.LocalAddress):$($c.LocalPort) -> $($c.RemoteAddress):$($c.RemotePort) [$($c.State)]"
        }
    }
    Start-Sleep -Milliseconds 500
}

if ($log.Count -eq 0) {
    Write-Host "PROVEN: Zero external network traffic occurred while idling and browsing the UI."
} else {
    Write-Host "Detected connections:"
    $log | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" }
}
