# ESG Reporting Platform

A non-financial ESG reporting platform for companies in Kazakhstan.

## Production

- **Frontend:** https://esg-non-financial-reporting-platfor.vercel.app
- **Backend API:** https://esg-non-financial-reporting-platform-production.up.railway.app

---

## Project Structure

```
esg-report/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── backend/              # Django settings (settings, urls, wsgi)
│   ├── api/                  # REST API
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── serializers.py
│   ├── accounts/             # Users and authentication
│   ├── companies/            # Companies
│   ├── reports/              # Reports, questionnaires, periods, recommendations
│   └── core/                 # Middleware (audit log)
└── frontend/
    └── src/
        ├── services/
        │   └── api.ts        # API layer
        ├── contexts/
        │   └── AuthContext.tsx
        └── pages/            # Pages for all roles
```

---

## Running Locally

### Backend (Django)

```bash
cd backend

python3 -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows

pip install -r requirements.txt

python manage.py migrate

# Create an administrator
python manage.py shell -c "
from accounts.models import User, Role
User.objects.create_superuser(
    email='admin@esg.com',
    password='admin123',
    first_name='Admin',
    last_name='User',
    role=Role.ADMIN
)
print('Superuser created!')
"

# Create test periods (optional — can also be done via the UI)
python manage.py shell -c "
from reports.models import ReportingPeriod
from datetime import date
ReportingPeriod.objects.get_or_create(
    name='Q1 2026', year=2026, quarter=1,
    defaults={'start_date': date(2026,1,1), 'end_date': date(2026,3,31), 'is_active': True}
)
print('Period created!')
"

python manage.py runserver
# Backend: http://localhost:8000
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
# Frontend: http://localhost:3000
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login/` | Log in (returns JWT) |
| POST | `/api/auth/register/` | Register (respondent / viewer) |
| POST | `/api/auth/refresh/` | Refresh token |
| GET | `/api/auth/me/` | Current user |
| POST | `/api/auth/logout/` | Log out |
| GET | `/api/users/` | List users (admin) |
| POST | `/api/users/` | Create user (admin) |
| POST | `/api/users/{id}/toggle-block/` | Block/unblock user |
| GET | `/api/companies/` | List companies |
| POST | `/api/companies/` | Create company |
| GET | `/api/questionnaires/` | List questionnaires |
| POST | `/api/questionnaires/` | Create questionnaire |
| GET | `/api/questionnaires/{id}/` | Questionnaire with questions |
| GET | `/api/reports/` | List reports |
| POST | `/api/reports/` | Create report |
| POST | `/api/reports/{id}/submit/` | Submit report |
| POST | `/api/reports/{id}/review/` | Review report (admin) |
| GET | `/api/reports/{id}/answers/` | Get answers to questions |
| POST | `/api/reports/{id}/answers/` | Save answers |
| GET | `/api/reports/{id}/recommendations/` | Get recommendations |
| POST | `/api/reports/{id}/recommendations/` | Generate recommendations (admin) |
| GET | `/api/dashboard/stats/` | Dashboard statistics |
| GET | `/api/periods/` | List periods |
| POST | `/api/periods/` | Create period |

---

## User Roles

| Role | Access |
|------|--------|
| `administrator` | Full access: users, companies, questionnaires, all reports, periods |
| `respondent` | Create and submit their own reports |
| `viewer` | View submitted reports and analytics |

> An administrator can only be created via the CLI. The registration form can only create a `respondent` or `viewer`.

---

## Known Limitations

- PDF export of reports renders Cyrillic text with encoding errors
- Reporting periods used to be creatable only via the CLI — now also available through the UI, in the "Periods" section