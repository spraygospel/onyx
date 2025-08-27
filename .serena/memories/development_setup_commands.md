# Onyx Development Setup Commands

## Prerequisites Installation

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install Python dependencies using uv (faster pip alternative)
pip install uv
uv pip install -r backend/requirements/default.txt
uv pip install -r backend/requirements/dev.txt
uv pip install -r backend/requirements/ee.txt
uv pip install -r backend/requirements/model_server.txt

# Install Playwright for E2E testing
playwright install

# Install frontend dependencies
cd web && npm install && cd ..
```

## Database Setup (First Time Only)

```bash
# Run database migrations
cd backend
alembic upgrade head
cd ..
```

## Development Services Startup

### 1. Start Docker Dependencies
```bash
cd deployment/docker_compose
docker compose -f docker-compose.dev.yml -p onyx-stack up -d index relational_db cache minio
cd ../..
```

### 2. Start Backend Services (4 Terminals)

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
python ./scripts/dev_run_background_jobs.py
```

**Terminal 3 - API Server:**
```bash
source venv/bin/activate
cd backend
AUTH_TYPE=disabled uvicorn onyx.main:app --reload --port 8080
```

**Terminal 4 - Frontend:**
```bash
cd web
npm run dev
```

## Testing Commands

### Backend Testing
```bash
# Run all backend tests
cd backend
pytest

# Run specific test file
pytest tests/unit/path/to/test_file.py

# Run tests with coverage
pytest --cov=onyx tests/
```

### Frontend Testing
```bash
# Run all frontend tests
cd web
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests with Playwright
npm run test:e2e
```

## Development Utilities

### Code Quality
```bash
# Backend linting and formatting
cd backend
black . --check  # Check formatting
black .          # Apply formatting
ruff .           # Linting
mypy .           # Type checking

# Frontend linting and formatting
cd web
npm run lint     # ESLint
npm run format   # Prettier
npm run type-check # TypeScript checking
```

### Database Operations
```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Troubleshooting Commands

### Check Service Status
```bash
# Check if ports are in use
netstat -tlnp 2>/dev/null | grep -E ':8080|:9000' || lsof -i :8080,9000 2>/dev/null

# Check Docker containers
docker ps

# Check Docker logs
docker logs container_name
```

### Clean Development Environment  
```bash
# Stop all Docker containers
docker compose -f deployment/docker_compose/docker-compose.dev.yml -p onyx-stack down

# Clean Docker volumes (WARNING: removes data)
docker compose -f deployment/docker_compose/docker-compose.dev.yml -p onyx-stack down -v

# Clean node_modules and reinstall
cd web && rm -rf node_modules package-lock.json && npm install && cd ..

# Clean Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -delete
```