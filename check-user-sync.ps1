# Check User Sync Status in Neon Database
# This script queries the Neon database to check if auth_id is set for users

$connectionString = $env:WHATSAPP_DB_CONNECTION_STRING

if (-not $connectionString) {
    Write-Host "ERROR: WHATSAPP_DB_CONNECTION_STRING environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "To set it temporarily for this session:"
    Write-Host '$env:WHATSAPP_DB_CONNECTION_STRING = "postgresql://neondb_owner:npg_HclN2sBL5OIF@ep-solitary-salad-a1alphes-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"'
    exit
}

Write-Host "Checking users in Neon database..." -ForegroundColor Cyan
Write-Host ""

# Query via psql if available, otherwise show connection string
try {
    # Check if psql is available
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlPath) {
        Write-Host "Running query with psql..." -ForegroundColor Green
        $query = "SELECT id, username, auth_id, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
        psql $connectionString -c $query
    } else {
        Write-Host "psql not found. Install PostgreSQL client or use online SQL editor" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Connection string:" -ForegroundColor Cyan
        Write-Host $connectionString
        Write-Host ""
        Write-Host "Query to run:" -ForegroundColor Cyan
        Write-Host "SELECT id, username, auth_id, name, role FROM users ORDER BY created_at DESC LIMIT 5;"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "To check specific user:" -ForegroundColor Cyan
Write-Host "SELECT id, username, auth_id, name FROM users WHERE username = 'your-email@example.com';"
