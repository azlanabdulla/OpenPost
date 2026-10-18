param(
    [string]$Substring = "OpenPost",
    [string]$OutputPath = "test_window_capture.png"
)

Add-Type -Path "$PSScriptRoot\WindowSnap.cs" -ReferencedAssemblies "System.Drawing"
$res = [WindowSnap]::CaptureSubstring($Substring, $OutputPath)
Write-Output "CaptureResult=$res"
