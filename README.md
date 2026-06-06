# Wcontent - Full-Stack Content Creator Platform

Wcontent is an enterprise-ready, decoupled full-stack web application tailored for content creators. The platform allows creators to publish drafts, generate AI-optimized SEO titles, collaborate with other creators via cloud-based workflows, and compile comments sentiment analysis.

This repository demonstrates modern software engineering patterns including **Hybrid Polyglot Persistence**, **Offline-Fallback Resiliency**, **Custom JWT Claims Optimization**, and **Google Gemini LLM Integration**.

---

## 🚀 Key Architectural Highlights

*   **Polyglot Persistence (MySQL + MongoDB Atlas)**: Relational transactional data (Users, Profiles, Posts) are stored in MySQL. Unstructured, read/write-heavy documents (Collaboration Requests, Workflows, Notifications) are stored in a managed MongoDB Atlas cloud cluster.
*   **Offline-Fallback Database Resiliency**: A custom data-access layer wrapper in Python catches MongoDB connection drops and seamlessly redirects all document transactions to a local JSON database on the disk. This ensures 100% server uptime and graceful service degradation.
*   **Custom JWT Token Claims**: Extends Django's `SimpleJWT` serializer to inject user profile metadata directly into the access token payload. React decodes the payload locally instantly on startup using a pure JS helper, eliminating redundant profile-fetching API requests.
*   **Gemini AI Analytics**: Integrates Google's **Gemini 2.5 Flash** model via the official `google-genai` SDK. Implements custom prompts to deliver instant SEO article title suggestions and sentiment-based comment summaries.

---

## 🛠️ Technology Stack
*   **Backend**: Python, Django, Django REST Framework (DRF), SimpleJWT, PyMySQL, PyMongo, Pillow, python-dotenv
*   **Frontend**: ReactJS, Vite, Vanilla CSS Variables, Lucide React
*   **Databases**: MySQL, MongoDB Atlas (Cloud)
*   **AI Engine**: Google Gemini API (`google-genai` SDK)

---

## 📦 Directory Structure

```text
Wcontent/
├── backend/
│   ├── manage.py            # Django CLI management tool
│   ├── .env                 # Environment variables config
│   ├── wcontent_project/    # Django core project configurations
│   └── api/                 # Django app containing views, models, and AI utilities
└── frontend/
    ├── index.html           # Main HTML index wrapper
    ├── src/
    │   ├── components/      # Sidebar, route guards, UI elements
    │   ├── context/         # AuthContext state manager & JWT parser
    │   └── pages/           # Login, Register, Dashboard, Posts, Collabs, AI Tools
    └── vite.config.js       # Vite configuration file
```

---

## ⚙️ Installation & Setup

### Prerequisites
*   Python 3.10+
*   Node.js (LTS version)
*   MySQL Server (installed locally)
*   MongoDB Atlas account (or MongoDB local instance)
*   Google Gemini API Key (obtained from [Google AI Studio](https://aistudio.google.com/))

---

### 1. Backend Setup

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    *   **Windows (PowerShell)**:
        ```bash
        python -m venv .venv
        .venv\Scripts\Activate.ps1
        ```
    *   **macOS/Linux**:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```
3.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Copy `.env.example` to `.env` and fill in your details:
    *   **DB_PASSWORD**: Your local MySQL root password.
    *   **MONGO_URI**: Your MongoDB Atlas connection link (url-encoded `@` as `%40`).
    *   **GEMINI_API_KEY**: Your Google Gemini API Key.
5.  Create the MySQL database:
    ```sql
    CREATE DATABASE wcontent;
    ```
6.  Run database migrations:
    ```bash
    python manage.py makemigrations api
    python manage.py migrate
    ```
7.  Create a Django admin superuser account:
    ```bash
    python manage.py createsuperuser
    ```
8.  Start the development server:
    ```bash
    python manage.py runserver
    ```
    *(Backend runs at `http://127.0.0.1:8000/`)*

---

### 2. Frontend Setup

1.  Navigate to the `frontend` folder:
    ```bash
    cd ../frontend
    ```
2.  Install the node packages:
    ```bash
    npm install
    ```
3.  Start the local dev server:
    ```bash
    npm run dev
    ```
    *(Frontend web client runs at `http://localhost:5173/`)*

---

## 🧪 Automated Testing
Run the Django automated unit test suite checking registration signals, custom token claims, and simulated MongoDB offline failover:
```bash
cd backend
python manage.py test api
```
