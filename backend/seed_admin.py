"""
seed_admin.py
=============
Creates or updates the admin user in MongoDB.

Usage
-----
    # Option 1 – use the defaults defined below (quick local setup)
    python seed_admin.py

    # Option 2 – override via environment variables (CI / production)
    ADMIN_EMAIL=admin@gmail.com ADMIN_PASSWORD=admin@127 python seed_admin.py

The script is idempotent: safe to run multiple times.
"""

import os
import sys
import datetime
from dotenv import load_dotenv

# ── Load .env so MONGO_URI etc. are available ─────────────────────────────────
load_dotenv()

# ── Lazy import so we can give a friendly error message ───────────────────────
try:
    from pymongo import MongoClient
    from pymongo.errors import ServerSelectionTimeoutError
except ImportError:
    print("[ERROR] pymongo is not installed.  Run:  pip install pymongo")
    sys.exit(1)

try:
    from werkzeug.security import generate_password_hash
except ImportError:
    print("[ERROR] werkzeug is not installed.  Run:  pip install werkzeug")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration  (override with env vars – never hard-code secrets in prod)
# ─────────────────────────────────────────────────────────────────────────────
MONGO_URI     = os.environ.get("MONGO_URI", "")
ADMIN_EMAIL   = os.environ.get("ADMIN_EMAIL",    "admin@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin@127")

# The collection your auth.py checks FIRST when logging in
TARGET_COLLECTION = "staff"

# ─────────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────────
if not MONGO_URI:
    print("[ERROR] MONGO_URI is not set.  Add it to your .env file.")
    sys.exit(1)

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print("[ERROR] ADMIN_EMAIL and ADMIN_PASSWORD must not be empty.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Connect
# ─────────────────────────────────────────────────────────────────────────────
print(f"[INFO] Connecting to MongoDB …")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()          # will raise if unreachable
except ServerSelectionTimeoutError as exc:
    print(f"[ERROR] Cannot reach MongoDB: {exc}")
    sys.exit(1)

# Resolve database (uses the name in the URI, falls back to 'laundry')
try:
    db = client.get_default_database()
except Exception:
    db = client["laundry"]

collection = db[TARGET_COLLECTION]

# ─────────────────────────────────────────────────────────────────────────────
# Hash the password using the SAME method as your auth.py
# werkzeug default: pbkdf2:sha256 with a random salt – bcrypt-level security
# ─────────────────────────────────────────────────────────────────────────────
hashed_password = generate_password_hash(ADMIN_PASSWORD)

# ─────────────────────────────────────────────────────────────────────────────
# Upsert  (create if not found, update password if already exists)
# ─────────────────────────────────────────────────────────────────────────────
now = datetime.datetime.utcnow()

result = collection.update_one(
    {"email": ADMIN_EMAIL},                       # filter
    {
        "$set": {
            "password":   hashed_password,
            "role":       "admin",
            "updated_at": now,
        },
        "$setOnInsert": {
            "email":      ADMIN_EMAIL,
            "name":       "Admin",
            "created_at": now,
        },
    },
    upsert=True,                                  # create if not found
)

# ─────────────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────────────
if result.upserted_id:
    print(f"[SUCCESS] Admin user CREATED in '{TARGET_COLLECTION}' collection.")
    print(f"          _id   : {result.upserted_id}")
else:
    print(f"[SUCCESS] Admin user PASSWORD UPDATED in '{TARGET_COLLECTION}' collection.")

print(f"          email : {ADMIN_EMAIL}")
print(f"          role  : admin")
print()
print("MongoDB document structure stored:")
print({
    "_id":        "<ObjectId>",
    "email":      ADMIN_EMAIL,
    "password":   "<werkzeug pbkdf2:sha256 hash>",
    "role":       "admin",
    "name":       "Admin",
    "created_at": "<UTC datetime>",
    "updated_at": "<UTC datetime>",
})
print()
print("[DONE] You can now log in with these credentials.")
