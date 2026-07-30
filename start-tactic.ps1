Write-Host "================================="
Write-Host "Starting TacTic Development Stack"
Write-Host "================================="

# Start Redis in WSL (with password 'admin' if needed)
Write-Host "Starting Redis in WSL..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "wsl bash -c 'redis-server --daemonize yes && echo admin | redis-cli -a admin ping || redis-cli ping'"

Start-Sleep -Seconds 3

# Start AI Service
Write-Host "Starting AI Service (port 8001)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
`$env:PYTHONPATH='D:\PFE_TACTIC\ai-service'
`$env:DATABASE_URL='postgresql://postgres:admin@127.0.0.1:5433/tactic_db'
cd D:\PFE_TACTIC\ai-service
C:\Users\dhiab\AppData\Local\Programs\Python\Python39\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
"@

Start-Sleep -Seconds 2

# Start React Frontend
Write-Host "Starting React Frontend (port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\PFE_TACTIC\frontend; npm start"

Write-Host ""
Write-Host "All services have been launched in separate terminal windows!"
Write-Host "- Redis: WSL"
Write-Host "- Backend: Laravel Herd (already running)"
Write-Host "- AI Service: http://127.0.0.1:8001"
Write-Host "- Frontend: http://localhost:3000"