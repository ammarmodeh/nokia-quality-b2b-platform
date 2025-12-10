# Comprehensive ClickUp Theme Converter - Phase 2
# Updates dropdowns, headers, table headers, and text colors

$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

# Define all replacements
$replacements = @(
    # Background colors with double quotes
    @{Pattern = 'backgroundColor: "#121212"'; Replacement = 'backgroundColor: "#f9fafb"'},
    @{Pattern = 'backgroundColor: "#1e1e1e"'; Replacement = 'backgroundColor: "#ffffff"'},
    @{Pattern = 'backgroundColor: "#272727"'; Replacement = 'backgroundColor: "#ffffff"'},
    @{Pattern = 'backgroundColor: "#333"'; Replacement = 'backgroundColor: "#f3f4f6"'},
    @{Pattern = 'background: "#121212"'; Replacement = 'background: "#f9fafb"'},
    
    # Background colors with single quotes
    @{Pattern = "backgroundColor: '#121212'"; Replacement = "backgroundColor: '#f9fafb'"},
    @{Pattern = "backgroundColor: '#1e1e1e'"; Replacement = "backgroundColor: '#ffffff'"},
    @{Pattern = "backgroundColor: '#272727'"; Replacement = "backgroundColor: '#ffffff'"},
    @{Pattern = "backgroundColor: '#333'"; Replacement = "backgroundColor: '#f3f4f6'"},
    @{Pattern = "background: '#121212'"; Replacement = "background: '#f9fafb'"},
    
    # Border colors
    @{Pattern = 'borderColor: "#444"'; Replacement = 'borderColor: "#e5e7eb"'},
    @{Pattern = "borderColor: '#444'"; Replacement = "borderColor: '#e5e7eb'"},
    @{Pattern = 'border: "1px solid #444"'; Replacement = 'border: "1px solid #e5e7eb"'},
    @{Pattern = "border: '1px solid #444'"; Replacement = "border: '1px solid #e5e7eb'"},
    
    # Text colors - white to dark
    @{Pattern = 'color: "#ffffff"'; Replacement = 'color: "#1f2937"'},
    @{Pattern = "color: '#ffffff'"; Replacement = "color: '#1f2937'"},
    @{Pattern = 'color: "#fff"'; Replacement = 'color: "#1f2937"'},
    @{Pattern = "color: '#fff'"; Replacement = "color: '#1f2937'"},
    
    # Text colors - gray variations
    @{Pattern = 'color: "#A1A1A1"'; Replacement = 'color: "#6b7280"'},
    @{Pattern = "color: '#A1A1A1'"; Replacement = "color: '#6b7280'"},
    @{Pattern = 'color: "#b3b3b3"'; Replacement = 'color: "#6b7280"'},
    @{Pattern = 'color: "#9e9e9e"'; Replacement = 'color: "#6b7280"'},
    @{Pattern = 'color: "#aaaaaa"'; Replacement = 'color: "#6b7280"'},
    @{Pattern = 'color: "#767676"'; Replacement = 'color: "#6b7280"'},
    
    # Tailwind classes
    @{Pattern = 'text-white'; Replacement = 'text-gray-900'},
    @{Pattern = 'text-gray-100'; Replacement = 'text-gray-900'},
    @{Pattern = 'text-gray-200'; Replacement = 'text-gray-700'},
    @{Pattern = 'text-gray-300'; Replacement = 'text-gray-700'},
    @{Pattern = 'text-\[#ffffff\]'; Replacement = 'text-gray-900'},
    @{Pattern = 'text-\[#A1A1A1\]'; Replacement = 'text-gray-600'},
    @{Pattern = 'hover:bg-\[#333\]'; Replacement = 'hover:bg-[#f3f4f6]'},
    @{Pattern = 'hover:bg-\[#272727\]'; Replacement = 'hover:bg-[#f3f4f6]'}
)

# Get all .jsx files
$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse

$updatedCount = 0
$totalFiles = $files.Count

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2: Fine-tuning Theme Details" -ForegroundColor Cyan
Write-Host "Found $totalFiles .jsx files" -ForegroundColor Cyan
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
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Complete!" -ForegroundColor Green
Write-Host "Files updated: $updatedCount / $totalFiles" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
