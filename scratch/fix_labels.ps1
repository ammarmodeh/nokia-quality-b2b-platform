$path = "c:\Users\LENOVO\Desktop\Coding\B1 MERN Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project\client\src\components\FieldTeamPortal\GlobalAnalytics.jsx"
$content = Get-Content $path -Raw
$content = $content -replace 'Audited Transactions: <span style={{ color: ''#8b5cf6'', fontWeight: 800 }}>\{globalAnalytics.totalAuditedTransactions\}</span>', 'Total Samples (Target): <span style={{ color: ''#8b5cf6'', fontWeight: 800 }}>{globalAnalytics.totalSamplesTarget}</span>'
$content = $content -replace 'Samples Taken: <span style={{ color: ''#10b981'', fontWeight: 800 }}>\{globalAnalytics.totalSamplesTaken\}</span>', 'Audited (Low Satisfaction): <span style={{ color: ''#ef4444'', fontWeight: 800 }}>{globalAnalytics.totalAuditedLowSatisfaction}</span>'
$content | Set-Content $path -NoNewline
