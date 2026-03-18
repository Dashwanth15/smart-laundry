Flask + MongoDB backend for Laundry app (login/register)

Quick start (Windows PowerShell):

- create a venv: python -m venv .venv
- activate: .\.venv\Scripts\Activate.ps1
- install: pip install -r requirements.txt
- run: python app.py


If you have a running MongoDB, set `MONGO_URI` via environment variables or an uncommitted `.env` file before running. Example `.env` (do NOT commit this file):

MONGO_URI=mongodb://localhost:27017/laundry
SECRET_KEY=replace-with-a-strong-secret
FRONTEND_ORIGIN=http://localhost:3000

Security note: Do not commit `.env` to version control. A `.gitignore` entry is provided to help.

Endpoints (JSON):
- POST /api/register {email, password, name?} -> 201
- POST /api/login {email, password} -> 200 {token}

If MONGO_URI is not set the app uses an in-memory fallback for quick local testing (not persistent).

Helper:
- `create_user.py` - small script to create a user directly into MongoDB (useful for testing with real DB).

