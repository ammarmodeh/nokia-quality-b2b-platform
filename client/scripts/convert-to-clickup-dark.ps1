# ClickUp Dark Theme Converter
$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

$replacements = @(
    @{Pattern = 'backgroundColor: "#f9fafb"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: '#f9fafb'"; Replacement = "backgroundColor: '#2d2d2d'"},
    @{Pattern = 'backgroundColor: "#ffffff"'; Replacement = 'backgroundColor: "#2d2d2d"'},
    @{Pattern = "backgroundColor: '#ffffff'"; Replacement = "backgroundColor: '#2d2d2d'"},
    @{Pattern = 'background: "#f9fafb"'; Replacement = 'background: "#2d2d2d"'},
    @{Pattern = "background: '#f9fafb'"; Replacement = "background: '#2d2d2d'"},
    @{Pattern = 'bg-\[#f9fafb\]'; Replacement = 'bg-[#2d2d2d]'},
    @{Pattern = 'bg-white'; Replacement = 'bg-[#2d2d2d]'},
    @{Pattern = 'bg-\[#f3f4f6\]'; Replacement = 'bg-[#2d2d2d]'},
    @{Pattern = 'color: "#1f2937"'; Replacement = 'color: "#ffffff"'},
    @{Pattern = "color: '#1f2937'"; Replacement = "color: '#ffffff'"},
    @{Pattern = 'color: "#6b7280"'; Replacement = 'color: "#b3b3b3"'},
    @{Pattern = "color: '#6b7280'"; Replacement = "color: '#b3b3b3'"},
    @{Pattern = 'text-gray-900'; Replacement = 'text-white'},
    @{Pattern = 'text-gray-700'; Replacement = 'text-gray-300'},
    @{Pattern = 'text-gray-600'; Replacement = 'text-gray-400'},
    @{Pattern = 'borderColor: "#e5e7eb"'; Replacement = 'borderColor: "#3d3d3d"'},
    @{Pattern = "borderColor: '#e5e7eb'"; Replacement = "borderColor: '#3d3d3d'"},
    @{Pattern = 'border: "1px solid #e5e7eb"'; Replacement = 'border: "1px solid #3d3d3d"'},
    @{Pattern = "border: '1px solid #e5e7eb'"; Replacement = "border: '1px solid #3d3d3d'"},
    @{Pattern = 'border-\[#e5e7eb\]'; Replacement = 'border-[#3d3d3d]'},
    @{Pattern = 'hover:bg-\[#f3f4f6\]'; Replacement = 'hover:bg-[#3d3d3d]'}
)

$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse
$updatedCount = 0
$totalFiles = $files.Count

Write-Host "Converting to ClickUp Dark Theme..." -ForegroundColor Cyan
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
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Complete! Files updated: $updatedCount / $totalFiles" -ForegroundColor Yellow
