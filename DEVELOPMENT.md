# Onyx Development Guide

Quick setup guide for Onyx development mode with custom port configuration.

## Prerequisites

- Python 3.11+ with virtual environment
- Node.js 18+ with npm
- Docker and Docker Compose
- Git

## Development Setup

### 1. Dependencies Installation

```bash
# Backend dependencies (in virtual environment)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install uv
uv pip install -r backend/requirements/default.txt
uv pip install -r backend/requirements/dev.txt
uv pip install -r backend/requirements/ee.txt
uv pip install -r backend/requirements/model_server.txt
playwright install

# Frontend dependencies
cd web
npm install
cd ..
```

### 2. Database Migration (First time only)

```bash
# With venv activated
cd backend
alembic upgrade head
cd ..
```

### 3. Environment Configuration

Configuration file: `backend/.env.dev`
```env
# Already configured with custom ports:
# Frontend: 9000, Backend: 8080, Model Server: 9001
```

## Running Development Services

### 1. Start Docker Dependencies

```bash
cd deployment/docker_compose
docker compose -f docker-compose.dev.yml -p onyx-stack up -d index relational_db cache minio
cd ../..
```

**Services started:**
- PostgreSQL: `localhost:5432`
- Vespa: `localhost:8081`  
- Redis: `localhost:6379`
- MinIO API: `localhost:9004`
- MinIO Console: `localhost:9005`

### 2. Start Backend Services

**Terminal 1 - Model Server:**
```bash
source venv/bin/activate
cd backend
uvicorn model_server.main:app --reload --port 9001
```

**Terminal 2 - Background Jobs:**
```bash
source venv/bin/activate
cd backend
python ./scripts/dev_run_background_jobs.py OR source .env.dev && python ./scripts/dev_run_background_jobs.py
```

**Terminal 3 - API Server:**
```bash
source venv/bin/activate
cd backend
AUTH_TYPE=disabled uvicorn onyx.main:app --reload --port 8080
```

### 3. Start Frontend

**Terminal 4 - Web Frontend:**
```bash
cd web
npm run dev
```

## Access URLs

- **Frontend**: http://localhost:9000
- **Backend API**: http://localhost:8080
- **API Docs**: http://localhost:8080/docs
- **MinIO Console**: http://localhost:9005

## Development Workflow

1. **Code Changes**: Edit files in `backend/` or `web/`
2. **Hot Reload**: Services automatically restart on file changes
3. **Testing**: Frontend ↔ Backend API ↔ Model Server communication
4. **Debugging**: Check terminal outputs for errors

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 9000 | User interface (reverse proxy compatible) |
| Backend API | 8080 | REST API server |
| Model Server | 9001 | NLP/AI processing |
| PostgreSQL | 5432 | Database |
| Vespa | 8081 | Search index |
| Redis | 6379 | Cache |
| MinIO API | 9004 | File storage |
| MinIO Console | 9005 | Storage admin |

## Troubleshooting

**Port conflicts:**
```bash
# Check what's using a port
netstat -tlnp 2>/dev/null | grep -E ':8080|:9000' || lsof -i :8080,9000 2>/dev/null
netstat -tulpn 2>/dev/null | grep :9000

# Kill process using port
kill [8080 process ID] [9000 process ID]
```

**Backend errors:** Check `.env.dev` configuration and Docker services status

**Frontend errors:** Ensure backend API (8080) is running first

## Quick Start Script

```bash
# Start everything (run in separate terminals)
./scripts/dev-start-docker.sh    # Docker services
./scripts/dev-start-backend.sh   # All backend services  
./scripts/dev-start-frontend.sh  # Frontend
```

For detailed setup, see [CONTRIBUTING.md](./CONTRIBUTING.md).