# 🧺 Wash-Up — Smart Laundry Management System

> **A full-stack web application built to streamline laundry operations for residential facilities — from scheduling and batch management to itemized billing and UPI payments.**

---

## 📌 Project Overview

Managing laundry for a large residential facility — a hostel, student housing complex, or similar setup — is surprisingly chaotic. Staff juggle paper registers, students lose their clothes, billing is inconsistent, and there's no clear audit trail.

**Wash-Up** was built to fix exactly that.

The system operates on a calendar-driven batch model: each day is automatically classified as a Boys day, Girls day, or Holiday based on the day of the week. Staff log in, navigate to a date, open the relevant batch, and manage every order from intake to invoice — all in one place.

What makes it stand out isn't just the feature set, but the thoughtful backend decisions: JWT authentication with token verification on every page load, rate-limited API endpoints, a MongoDB + in-memory fallback pattern for resilient local development, and a service abstraction layer on the frontend that cleanly separates API concerns from UI logic.

---

## ✨ Key Features

### 👤 User / Staff Features

- **JWT Authentication** — Secure login with token-based sessions. Tokens are verified against the backend on every app load, not just stored in localStorage blindly.
- **Forgot Password Flow** — Self-service password reset for staff accounts.
- **Change Password** — Authenticated users can update their credentials with current-password verification.
- **Interactive Calendar View** — Navigate months, see batch counts per day at a glance with a hover preview, and tap any date to open its batch.
- **Day-Type Smart Routing** — The system automatically classifies each calendar day (Boys / Girls / Holiday) based on the day of the week, removing manual selection errors.
- **Batch Management** — Open a batch for any date, view all active sub-batches, and drill into individual batch records.
- **Student Registration** — Add students to a batch with full details: name, student ID, phone, email, address, bag number, and time slot.
- **Searchable Student Lookup** — Find existing students by name or phone number across batches — no duplicate entries.
- **Itemized Clothing Billing** — Log exact cloth types (T-shirts, Shorts, Bedsheets, Blankets) with per-item rates. Quantities are tracked individually.
- **Automatic Bill Calculation** — Total cost is computed in real time as items are added, with configurable GST applied on top.
- **UPI QR Code Generation** — The app dynamically generates a UPI payment QR code (using the configured UPI ID) with the exact payable amount including GST — ready for instant scan-to-pay.
- **Invoice Modal + Print** — Generate a printable invoice for any order, directly from the browser.
- **Toast Notifications** — Real-time feedback on all actions (add, update, delete) using `react-toastify`.
- **Protected Routes** — Calendar, Batch, and BatchType views are behind a `PrivateRoute` guard. Unauthenticated users are redirected to login.

### 🛠️ Admin / System Features

- **Staff Collection Separation** — Staff accounts live in a dedicated MongoDB collection, separate from general users. Login checks staff first, then falls back to the users collection.
- **Rate Limiting** — API endpoints are protected with `Flask-Limiter` (200 req/day, 50 req/hour per IP) to prevent abuse.
- **CORS Origin Control** — CORS is locked to the configured `FRONTEND_ORIGIN`. Supports single origin, comma-separated list, or wildcard.
- **Configurable Token Expiry** — JWT expiry is set via environment variable (`TOKEN_EXPIRES_SECONDS`), not hardcoded.
- **Date Range Queries** — The batches API supports flexible date filtering: exact date, date range, or month-level queries (auto-expanded to first/last day of month).
- **MongoDB + In-Memory Fallback** — If `MONGO_URI` is not set or MongoDB is unreachable, the app automatically falls back to an in-memory store — making local development and testing require zero infrastructure.
- **Unique Email Index** — MongoDB enforces a unique index on the `email` field in the users collection, with `DuplicateKeyError` handled gracefully at the API layer.
- **Smoke Tests** — Backend includes `test_smoke.py` and `test_login.py` for baseline API verification.
- **Utility Scripts** — `add_user.py`, `create_user.py`, `set_password.py`, and `inspect_user.py` for direct DB operations during setup and maintenance.

---

## 🏗️ System Architecture

The application follows a clean client-server separation with a RESTful API as the contract between the two.

```
┌─────────────────────────────────────┐
│           React Frontend            │
│  (SPA — React Router, AuthContext)  │
│                                     │
│  Pages: Home / Login / Calendar /   │
│         Batch / BatchType           │
│  Services: batchService.js (API)    │
└────────────────┬────────────────────┘
                 │ HTTP + Bearer JWT
                 ▼
┌─────────────────────────────────────┐
│         Flask REST API              │
│                                     │
│  Blueprints:                        │
│    /api/auth  → auth.py             │
│    /api/batch → batches.py          │
│                                     │
│  Middleware: CORS, Rate Limiter     │
│  Auth: JWT (PyJWT, HS256)           │
└────────────────┬────────────────────┘
                 │ PyMongo
                 ▼
┌─────────────────────────────────────┐
│           MongoDB                   │
│                                     │
│  Collections:                       │
│    users   — registered users       │
│    staff   — staff accounts         │
│    batches — laundry batch records  │
└─────────────────────────────────────┘
```

**Key architectural decisions:**

- **React Context API** (`AuthContext`) is used for global auth state — no Redux overhead for this scope.
- **`PrivateRoute` wrapper** guards protected pages at the router level, not component level.
- **`batchService.js`** is a dedicated service module that centralizes all API calls, keeping components clean.
- **Flask Blueprints** split auth (`auth_bp`) and batch logic (`batches_bp`) for maintainable route organization.
- **Dual-collection auth** lets you separate staff from customer accounts without a role field, keeping queries simple.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| React Context API | Global auth state management |
| `react-toastify` | Toast notifications |
| `qrcode` (npm) | Dynamic UPI QR code generation |
| CSS3 | Custom styling (no UI framework) |

### Backend
| Technology | Purpose |
|---|---|
| Python / Flask | REST API server |
| PyJWT | JWT token creation & verification |
| Werkzeug | Password hashing (PBKDF2) |
| Flask-CORS | Cross-origin request handling |
| Flask-Limiter | API rate limiting |
| PyMongo | MongoDB driver |
| python-dotenv | Environment variable management |

### Database
| Technology | Purpose |
|---|---|
| MongoDB | Primary data store |
| In-Memory fallback | Zero-config local development |

### Dev & Tooling
| Technology | Purpose |
|---|---|
| pytest + requests | Backend smoke & login tests |
| python-dotenv | `.env` configuration |
| React Scripts (CRA) | Frontend dev server & build |

---

## 🔄 Workflow

Here's how the system works end-to-end, from staff login to a completed laundry order:

**1. Authentication**
Staff navigate to `/login`. On submit, credentials are POSTed to `/api/login`. The backend checks the `staff` collection first, then `users`. On success, a signed JWT (HS256) is returned and stored in `localStorage`. On every subsequent app load, the token is verified against `/api/verify-token` before the UI is rendered.

**2. Calendar Navigation**
After login, staff land on `/calendar`. The calendar is built client-side from the current month, with each day auto-typed as Boys, Girls, or Holiday. Hovering a day shows a preview of existing batch counts fetched from the API.

**3. Batch Selection**
Clicking a day navigates to `/batch/:date/:dayType`, which lists the available batch types for that day and shows how many records are in each.

**4. Order Entry**
Selecting a batch type opens `/batch/:date/:dayType/:batchType`. Staff click "Add" to open the intake form. They fill in student details and select cloth items with quantities. The bill total and GST are calculated in real time.

**5. UPI Payment**
Once items are added, a UPI QR code is generated dynamically using the configured `upiId` and the exact amount. The student scans and pays; staff enter the Transaction ID and save.

**6. Invoice**
An invoice can be generated and printed directly from the browser for any completed order.

**7. Data Persistence**
All batch and student data is saved to MongoDB via the Flask API with JWT authorization on every write.

---

## 📸 Screenshots

### 🏠 Landing Page
![Landing Page](./screenshots/landing.png)

### 🔐 Login Page
![Login](./screenshots/login.png)

### 📅 Calendar View
![Calendar](./screenshots/calendar.png)

### 🧺 Batch Overview
![Batch Overview](./screenshots/batch.png)

### 📋 Order Entry Form
![Order Entry](./screenshots/order-entry.png)

### 💳 UPI QR Code & Billing
![Billing & QR](./screenshots/billing-qr.png)

### 🧾 Invoice / Print View
![Invoice](./screenshots/invoice.png)

---

## 💡 Advantages & Benefits

**For Staff**
- No more paper registers — every order is searchable and auditable
- Real-time billing means no manual calculation errors
- UPI QR code generation removes the need for a POS terminal
- Printable invoices from any browser, no special software

**For Facilities Management**
- Complete history of all batches by date, day type, and batch category
- Student lookup across batches prevents duplicate entries and tracks history
- Configurable GST and pricing per item type
- Rate-limited API prevents bulk scraping or accidental floods

**For Developers**
- Clean separation of concerns: service layer, context, blueprints
- In-memory fallback means anyone can clone and run the project with zero infrastructure
- Environment-driven configuration (origin, secret key, token TTL) makes deployment straightforward
- Comprehensive utility scripts for user management without needing a DB GUI

---

## 🎯 What This Project Demonstrates

| Skill | How It Shows Up |
|---|---|
| **Full-Stack Architecture** | React SPA ↔ Flask REST API ↔ MongoDB, cleanly separated with a service layer |
| **JWT Authentication** | Token creation, signing, expiry, verification, and protected route guards |
| **Password Security** | PBKDF2 hashing via Werkzeug, current-password verification before updates |
| **API Design** | RESTful routes with proper HTTP methods, status codes, and error responses |
| **State Management** | React Context API for global auth state without external state libraries |
| **Dynamic UX** | Real-time bill calculation, QR code generation, toast notifications, calendar previews |
| **Data Modeling** | Multi-collection MongoDB schema (users, staff, batches, students) |
| **Resilient Design** | In-memory DB fallback, graceful error handling, token expiry recovery |
| **Security Thinking** | Rate limiting, CORS origin restriction, no sensitive data in JWT payload |
| **Code Organization** | Flask Blueprints, React component/service separation, reusable context hooks |

---

## 📁 Project Structure

```
laundry-web/
├── backend/
│   ├── app.py              # App factory: Flask setup, CORS, rate limiter, blueprints
│   ├── auth.py             # Auth blueprint: register, login, /me, verify-token, change-password
│   ├── batches.py          # Batches blueprint: CRUD for batches + student management
│   ├── db.py               # MongoDB init + InMemoryDB fallback implementation
│   ├── add_user.py         # CLI: add a user directly to DB
│   ├── create_user.py      # CLI: create user with hashed password
│   ├── set_password.py     # CLI: reset a user's password
│   ├── inspect_user.py     # CLI: inspect a user record
│   ├── login_user.py       # CLI: test login flow
│   ├── test_smoke.py       # Pytest: smoke tests for core API routes
│   ├── test_login.py       # Pytest: login endpoint tests
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # Local environment variables (not committed)
│   └── .env.example        # Environment variable template
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.jsx             # Root: Router, AuthProvider, route definitions
    │   ├── login.jsx           # Login page
    │   ├── calendar.jsx        # Calendar view with month navigation + batch counts
    │   ├── batch.jsx           # Batch type selection for a given date
    │   ├── batchType.jsx       # Order entry: student form, itemized billing, QR, invoice
    │   ├── components/
    │   │   ├── Header.jsx      # Navigation header
    │   │   ├── Footer.jsx      # Page footer
    │   │   ├── Breadcrumb.jsx  # Dynamic breadcrumb navigation
    │   │   └── ForgotPassword.jsx
    │   ├── contexts/
    │   │   ├── AuthContext.jsx  # Global auth state + login/logout logic
    │   │   └── PrivateRoute.jsx # Route guard for authenticated pages
    │   ├── services/
    │   │   └── batchService.js # All API calls: batches, students, search
    │   ├── config.json         # App config: UPI ID, GST percentage
    │   └── styles.css          # Global styles
    └── package.json
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js v18+
- Python 3.9+
- MongoDB (optional — app runs with in-memory fallback)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/laundry-web.git
cd laundry-web
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/laundry
#   SECRET_KEY=your-strong-secret-key
#   FRONTEND_ORIGIN=http://localhost:3000
#   TOKEN_EXPIRES_SECONDS=3600

# Run the server
python app.py
# Server starts at http://127.0.0.1:5000
```

> **Note:** If `MONGO_URI` is not set, the backend automatically uses an in-memory store. Data will not persist between restarts, but everything works for local testing.

---

### 3. Create a Staff Account

```bash
# With the backend running:
python create_user.py
# Follow prompts to set email, name, and password
```

---

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# (Optional) Set API base URL if backend is not on localhost:5000
# Create .env in /frontend:
# REACT_APP_API_BASE=http://localhost:5000

# Start the dev server
npm start
# App opens at http://localhost:3000
```

---

### 5. Running Tests

```bash
cd backend
pytest test_smoke.py test_login.py -v
```

---

## 🔑 Sample Credentials

| Role | Email | Password |
|---|---|---|
| Staff | `admin@washup.com` | _(set during setup via `create_user.py`)_ |

> Staff accounts are stored in the `staff` collection. Use `create_user.py` or `add_user.py` to seed accounts before first login.

---

## ⚙️ Configuration Reference

| Variable | Location | Description |
|---|---|---|
| `MONGO_URI` | `backend/.env` | MongoDB connection string. Omit to use in-memory fallback. |
| `SECRET_KEY` | `backend/.env` | JWT signing secret. Use a strong random string in production. |
| `FRONTEND_ORIGIN` | `backend/.env` | Allowed CORS origin(s). Comma-separate for multiple. |
| `TOKEN_EXPIRES_SECONDS` | `backend/.env` | JWT token lifetime in seconds (default: 3600). |
| `upiId` | `frontend/src/config.json` | UPI ID for payment QR code generation. |
| `gstPercent` | `frontend/src/config.json` | GST percentage applied to order totals (e.g. `5` for 5%). |

---

## 👨‍💻 Author

**Your Name**
Full-Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-your--username-181717?style=flat&logo=github)](https://github.com/your-username)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-your--name-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/your-profile)
[![Portfolio](https://img.shields.io/badge/Portfolio-yourwebsite.com-000000?style=flat&logo=vercel)](https://yourwebsite.com)

---

> Built with 🧺 and way too much attention to edge cases.
