# ESG Reporting Platform

Платформа для нефинансовой ESG-отчётности компаний Казахстана.

## Продакшен

- **Фронтенд:** https://esg-non-financial-reporting-platfor.vercel.app
- **Бэкенд API:** https://esg-non-financial-reporting-platform-production.up.railway.app

---

## Структура проекта

```
esg-report/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── backend/              # Django настройки (settings, urls, wsgi)
│   ├── api/                  # REST API
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── serializers.py
│   ├── accounts/             # Пользователи и аутентификация
│   ├── companies/            # Компании
│   ├── reports/              # Отчёты, опросники, периоды, рекомендации
│   └── core/                 # Middleware (аудит-лог)
└── frontend/
    └── src/
        ├── services/
        │   └── api.ts        # API-слой
        ├── contexts/
        │   └── AuthContext.tsx
        └── pages/            # Страницы для всех ролей
```

---

## Локальный запуск

### Бэкенд (Django)

```bash
cd backend

python3 -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows

pip install -r requirements.txt

python manage.py migrate

# Создать администратора
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

# Создать тестовые периоды (опционально — можно через UI)
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
# Бэкенд: http://localhost:8000
```

### Фронтенд (React)

```bash
cd frontend
npm install
npm start
# Фронтенд: http://localhost:3000
```

---

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/login/` | Вход (возвращает JWT) |
| POST | `/api/auth/register/` | Регистрация (respondent / viewer) |
| POST | `/api/auth/refresh/` | Обновление токена |
| GET | `/api/auth/me/` | Текущий пользователь |
| POST | `/api/auth/logout/` | Выход |
| GET | `/api/users/` | Список пользователей (admin) |
| POST | `/api/users/` | Создать пользователя (admin) |
| POST | `/api/users/{id}/toggle-block/` | Блок/разблок пользователя |
| GET | `/api/companies/` | Список компаний |
| POST | `/api/companies/` | Создать компанию |
| GET | `/api/questionnaires/` | Список опросников |
| POST | `/api/questionnaires/` | Создать опросник |
| GET | `/api/questionnaires/{id}/` | Опросник с вопросами |
| GET | `/api/reports/` | Список отчётов |
| POST | `/api/reports/` | Создать отчёт |
| POST | `/api/reports/{id}/submit/` | Отправить отчёт |
| POST | `/api/reports/{id}/review/` | Проверить отчёт (admin) |
| GET | `/api/reports/{id}/answers/` | Ответы на вопросы |
| POST | `/api/reports/{id}/answers/` | Сохранить ответы |
| GET | `/api/reports/{id}/recommendations/` | Получить рекомендации |
| POST | `/api/reports/{id}/recommendations/` | Сгенерировать рекомендации (admin) |
| GET | `/api/dashboard/stats/` | Статистика для дашборда |
| GET | `/api/periods/` | Список периодов |
| POST | `/api/periods/` | Создать период |

---

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `administrator` | Полный доступ: пользователи, компании, опросники, все отчёты, периоды |
| `respondent` | Создание и отправка своих отчётов |
| `viewer` | Просмотр отправленных отчётов и аналитики |

> Администратор создаётся только через CLI. Через форму регистрации можно создать только respondent или viewer.

---

## Известные ограничения

- PDF-экспорт отчётов отображает кириллицу с ошибками кодировки
- Отчётные периоды ранее создавались только через CLI — теперь доступно через UI в разделе "Периоды"