# Restore ClickUp Color Hierarchy
# Main background should be darker, cards should be lighter for depth

$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

$replacements = @(
    # Main backgrounds should be DARKER (#1a1a1a)
    @{Pattern = 'bg-\[#2d2d2d\] w-full h-full'; Replacement = 'bg-[#1a1a1a] w-full h-full'},
    @{Pattern = 'backgroundColor: "#2d2d2d", maxWidth'; Replacement = 'backgroundColor: "#1a1a1a", maxWidth'},
    @{Pattern = 'className="h-screen w-screen flex relative overflow-y-auto" style={{ backgroundColor: ''#2d2d2d'''; Replacement = 'className="h-screen w-screen flex relative overflow-y-auto" style={{ backgroundColor: ''#1a1a1a'''}
)

$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse
$updatedCount = 0

Write-Host "Restoring ClickUp Color Hierarchy..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $fileChanged = $false
    
    foreach ($replacement in $replacements) {
        $pattern = [regex]::Escape($replacement.Pattern)
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement.Replacement
            $fileChanged = $true
        }
    }
    
    if ($fileChanged) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $updatedCount++
        Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Complete! Files fixed: $updatedCount" -ForegroundColor Yellow
