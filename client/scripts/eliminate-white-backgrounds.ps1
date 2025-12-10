# Ultimate White Background Eliminator
# This script finds and fixes ALL white backgrounds including inline styles

$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

$replacements = @(
    # Explicit white colors
    @{Pattern = 'backgroundColor: "white"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: 'white'"; Replacement = "backgroundColor: '#2d2d2d'"},
    @{Pattern = 'background: "white"'; Replacement = 'background: "#2d2d2d"'},
    @{Pattern = "background: 'white'"; Replacement = "background: '#2d2d2d'"},
    
    # Tailwind white
    @{Pattern = ' bg-white '; Replacement = ' bg-[#2d2d2d] '},
    @{Pattern = ' bg-white"'; Replacement = ' bg-[#2d2d2d]"'},
    @{Pattern = '"bg-white '; Replacement = '"bg-[#2d2d2d] '},
    @{Pattern = '"bg-white"'; Replacement = '"bg-[#2d2d2d]"'},
    
    # Light grays that look white
    @{Pattern = 'bg-gray-50'; Replacement = 'bg-[#2d2d2d]'},
    @{Pattern = 'bg-gray-100'; Replacement = 'bg-[#2d2d2d]'},
    
    # Paper/Card sx prop backgrounds
    @{Pattern = 'bgcolor: "white"'; Replacement = 'bgcolor: "#2d2d2d"'},
    @{Pattern = "bgcolor: 'white'"; Replacement = "bgcolor: '#2d2d2d'"}
)

$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse
$updatedCount = 0
$totalFiles = $files.Count

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ultimate White Background Eliminator" -ForegroundColor Cyan
Write-Host "Found $totalFiles files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete!" -ForegroundColor Green
Write-Host "Files fixed: $updatedCount / $totalFiles" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
