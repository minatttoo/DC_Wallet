# 🤖 Personal AI Agent System

A full-stack Personal AI Agent system built to help you become a **top 1% software engineer** and achieve your life goals through AI-powered mentorship, goal tracking, and disciplined routine management.

## 🎯 Core Goals

| Goal | Category | Agent Expertise |
|------|----------|-----------------|
| 🖥️ Top 1% Software Engineer | `software_engineering` | React, .NET Core, Node.js, System Design |
| 🎯 Crack FAANG-level companies | `faang_prep` | LeetCode patterns, System Design interviews, Behavioural |
| 💬 Improve English communication | `english_communication` | Professional writing, verbal fluency, grammar |
| 💰 Build side income streams | `side_income` | Freelancing, SaaS, content creation, consulting |
| 💪 Physical + mental health | `health` | Fitness, nutrition, sleep, stress management |
| 📅 Disciplined daily routines | `daily_routine` | Time blocking, habit tracking, productivity |

---

## 🏗️ Architecture

```
ai-agent/
├── backend/          # Node.js + TypeScript API
│   ├── src/
│   │   ├── config/         # App config & logger
│   │   ├── middleware/      # JWT auth, error handler
│   │   ├── models/          # MongoDB schemas (User, Goal, Task, AgentSession, DailyRoutine)
│   │   ├── routes/          # REST API routes
│   │   └── services/        # OpenAI, Redis, RabbitMQ services
│   ├── Dockerfile
│   └── package.json
├── frontend/         # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── context/         # Auth context (JWT)
│   │   ├── pages/           # Dashboard, Goals, Tasks, AI Agent, Routine
│   │   └── services/        # Axios API client
│   ├── Dockerfile
│   └── nginx.conf
├── infra/            # Terraform (Azure)
│   └── main.tf
├── docker-compose.yml
├── azure-pipelines.yml
└── .env.example
```

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript + Express |
| AI | OpenAI API (GPT-4o) or Azure OpenAI |
| Database | MongoDB (Mongoose) |
| Cache | Redis (ioredis) |
| Queue | RabbitMQ (amqplib) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Cloud | Azure Container Apps + CosmosDB + Azure Cache for Redis |
| DevOps | Docker Compose + Azure Pipelines + Terraform |

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- OpenAI API key (or Azure OpenAI credentials)

### 1. Start infrastructure

```bash
cd ai-agent
docker compose up mongodb redis rabbitmq -d
```

### 2. Backend

```bash
cd ai-agent/backend
cp ../.env.example .env
# Edit .env — set OPENAI_API_KEY at minimum
npm install
npm run dev
# API running at http://localhost:4000
```

### 3. Frontend

```bash
cd ai-agent/frontend
npm install
npm run dev
# App running at http://localhost:3000
```

---

## 🐳 Full Docker Compose

```bash
cd ai-agent
cp .env.example .env
# Edit .env — set OPENAI_API_KEY and JWT_SECRET
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- RabbitMQ UI: http://localhost:15672 (guest/guest)

---

## ☁️ Azure Deployment

### Using Azure Pipelines (CI/CD)

1. Set up pipeline variables in Azure DevOps:
   - `dockerServiceConnection` — your ACR service connection
   - `azureServiceConnection` — your Azure subscription service connection
   - `azureResourceGroup` — your resource group name
   - `containerRegistry` — your ACR login server
   - `OPENAI_API_KEY` — secret variable

2. Push to `main` branch — pipeline builds, pushes images, and deploys to Azure Container Apps.

### Using Terraform (Infrastructure)

```bash
cd ai-agent/infra
terraform init
terraform plan -var="openai_api_key=sk-..." -var="jwt_secret=..."
terraform apply
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get current user |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List all active goals |
| POST | `/api/goals` | Create goal (AI suggests milestones) |
| PATCH | `/api/goals/:id` | Update goal / progress |
| DELETE | `/api/goals/:id` | Archive goal |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filterable by status/category/date) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task status |
| DELETE | `/api/tasks/:id` | Delete task |

### AI Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/sessions` | List sessions |
| POST | `/api/agent/sessions` | Create new session |
| GET | `/api/agent/sessions/:id` | Get session with messages |
| POST | `/api/agent/sessions/:id/chat` | Send message, get AI reply |
| POST | `/api/agent/daily-plan` | Generate AI daily plan |

### Routines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routines?date=YYYY-MM-DD` | Get routine for date |
| POST | `/api/routines` | Create/replace routine |
| PATCH | `/api/routines/:id/complete` | Mark entry complete |

---

## 🧪 Tests

```bash
cd ai-agent/backend
npm test
```

---

## 🔐 Security Notes

- JWT tokens are signed with HS256 — use a strong secret in production
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting: 200 req/15min globally, 20 req/15min on auth routes
- Helmet.js headers enabled
- CORS restricted to configured origins
- Redis and RabbitMQ are optional — the app degrades gracefully if unavailable
