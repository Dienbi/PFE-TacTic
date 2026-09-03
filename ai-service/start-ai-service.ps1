$env:PYTHONPATH = "C:\PFE_TACTIC\ai-service"
$env:DATABASE_URL = "postgresql://postgres:admin@127.0.0.1:5433/tactic_db"
$env:GROQ_API_KEY = ""
$env:GEMINI_MODEL = "gemini-1.0-pro"
python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
