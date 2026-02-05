@echo off
REM Script to clear API keys from .env file (keep only placeholders)

echo 🔐 Clearing API keys from .env file...
echo.

if not exist .env (
    echo ⚠️  .env file not found
    pause
    exit /b 1
)

REM Backup original
copy .env .env.backup >nul
echo ✅ Created backup: .env.backup

REM Clear API keys using PowerShell (more reliable than batch)
powershell -Command "(Get-Content .env) -replace '^ANTHROPIC_API_KEY=.*', 'ANTHROPIC_API_KEY=' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace '^OPENAI_API_KEY=.*', 'OPENAI_API_KEY=' | Set-Content .env"

echo ✅ API keys cleared from .env
echo.
echo 💡 To set API keys, edit .env file directly:
echo    Add your keys to the .env file in the project root
echo.
echo    See SECURITY.md for detailed instructions
echo.

pause

