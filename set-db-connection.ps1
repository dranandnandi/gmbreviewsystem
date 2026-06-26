# Set WhatsApp Database Connection String
# Run this after replacing the placeholder with your actual Neon PostgreSQL credentials

# Example format:
# postgresql://username:password@ep-xyz-123.us-east-2.aws.neon.tech/neondb?sslmode=require

# IMPORTANT: Replace the placeholder below with your actual connection string
$connectionString = "postgresql://[username]:[password]@[neon-host]/[database]?sslmode=require"

# Uncomment and run this line after setting your connection string:
# netlify env:set WHATSAPP_DB_CONNECTION_STRING $connectionString

Write-Host "================================================"
Write-Host "WhatsApp Database Connection String Setup"
Write-Host "================================================"
Write-Host ""
Write-Host "Current placeholder: $connectionString"
Write-Host ""
Write-Host "To set the connection string:"
Write-Host "1. Get your Neon PostgreSQL connection string from Neon dashboard"
Write-Host "2. Replace the placeholder in this file (set-db-connection.ps1)"
Write-Host "3. Uncomment the netlify env:set line"
Write-Host "4. Run this script again"
Write-Host ""
Write-Host "Or manually run:"
Write-Host 'netlify env:set WHATSAPP_DB_CONNECTION_STRING "postgresql://..."'
Write-Host ""
