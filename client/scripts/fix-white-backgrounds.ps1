# Final ClickUp Dark Theme Fix - Remove ALL white backgrounds
$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

$replacements = @(
    # Any remaining white backgrounds
    @{Pattern = 'backgroundColor: "#ffffff"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: '#ffffff'"; Replacement = "backgroundColor: '#2d2d2d'"},
    @{Pattern = 'background: "#ffffff"'; Replacement = 'background: "#2d2d2d"'},
    @{Pattern = "background: '#ffffff'"; Replacement = "background: '#2d2d2d'"},
    
    # Tailwind white backgrounds
    @{Pattern = 'bg-white'; Replacement = 'bg-[#2d2d2d]'},
    
    # Light gray backgrounds that should be darker
    @{Pattern = 'backgroundColor: "#f3f4f6"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: '#f3f4f6'"; Replacement = "backgroundColor: '#2d2d2d'"},
    
    # Any #fff references
    @{Pattern = 'backgroundColor: "#fff"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: '#fff'"; Replacement = "backgroundColor: '#2d2d2d'"}
)

$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse
$updatedCount = 0
$totalFiles = $files.Count

Write-Host "Final ClickUp Dark Theme Fix..." -ForegroundColor Cyan
Write-Host "Removing ALL white backgrounds" -ForegroundColor Cyan
Write-Host "Found $totalFiles files" -ForegroundColor Cyan
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
Write-Host "Complete! Files fixed: $updatedCount / $totalFiles" -ForegroundColor Yellow
