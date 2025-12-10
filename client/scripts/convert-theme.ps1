# ClickUp Theme Batch Converter - PowerShell Script
# This script updates all .jsx files from dark theme to ClickUp light theme

$rootPath = "e:\Coding Section\B1 Node.js, MongoDB, React.js Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src"

# Color replacements
$replacements = @{
    # Background colors
    '#121212' = '#f9fafb'
    '#1e1e1e' = '#ffffff'
    '#272727' = '#ffffff'
    '#2d2d2da3' = '#ffffff'
    '#333' = '#f3f4f6'
    'bg-\[#121212\]' = 'bg-[#f9fafb]'
    'bg-\[#1e1e1e\]' = 'bg-white'
    
    # Border colors
    '#444' = '#e5e7eb'
    '#4f4f4f' = '#e5e7eb'
    'border-\[#444\]' = 'border-[#e5e7eb]'
    '#483c3c' = '#e5e7eb'
    
    # Text colors
    '#A1A1A1' = '#6b7280'
    '#b3b3b3' = '#6b7280'
    '#9e9e9e' = '#6b7280'
    '#aaaaaa' = '#6b7280'
    'text-gray-100' = 'text-gray-900'
    'text-gray-200' = 'text-gray-700'
    'text-gray-300' = 'text-gray-700'
    'text-gray-400' = 'text-gray-600'
    
    # Accent colors
    '#3ea6ff' = '#7b68ee'
    '#0d73bc' = '#7b68ee'
}

# Get all .jsx files
$files = Get-ChildItem -Path $rootPath -Filter *.jsx -Recurse

$updatedCount = 0
$totalFiles = $files.Count

Write-Host "Found $totalFiles .jsx files to process..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanged = $false
    
    foreach ($key in $replacements.Keys) {
        $value = $replacements[$key]
        if ($content -match [regex]::Escape($key)) {
            $content = $content -replace [regex]::Escape($key), $value
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
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Conversion Complete!" -ForegroundColor Green
Write-Host "Files updated: $updatedCount / $totalFiles" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
