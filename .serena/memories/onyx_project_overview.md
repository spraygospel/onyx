# Onyx Project Overview

## Purpose
Onyx (formerly Danswer) is an open-source GenAI + Enterprise Search platform that connects to company documents, apps, and people. It provides:
- AI-powered chat interface with multiple LLM support
- 40+ connectors (Google Drive, Slack, Confluence, etc.)
- Custom AI agents with unique prompts and knowledge
- Secure deployment (laptop, on-premise, or cloud)

## Tech Stack

### Backend
- **Language**: Python 3.11+
- **Web Framework**: FastAPI 
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic
- **AI/ML**: LiteLLM, Transformers, custom model server
- **Search**: Vespa
- **Storage**: MinIO (S3-compatible)
- **Cache**: Redis

### Frontend  
- **Framework**: Next.js 14 with React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload with uvicorn
- **Testing**: Pytest (backend), Jest/React Testing Library (frontend)

## Project Structure

```
onyx-fork/
├── backend/           # Python FastAPI server
│   ├── onyx/         # Main application code
│   ├── model_server/ # AI/ML model server
│   ├── tests/        # Backend tests
│   ├── scripts/      # Utility scripts
│   └── requirements/ # Dependency files
├── web/              # Next.js frontend
│   ├── src/          # Source code
│   └── tests/        # Frontend tests
├── deployment/       # Docker configurations
├── dev_plan/         # Development planning documents
└── examples/         # Example configurations
```

## Development Ports
- Frontend: http://localhost:9000 (custom port for reverse proxy)
- Backend API: http://localhost:8080 
- Model Server: http://localhost:9001
- PostgreSQL: localhost:5432
- Vespa Search: localhost:8081
- Redis: localhost:6379
- MinIO API: localhost:9004
- MinIO Console: localhost:9005

## Key Features
- Multiple LLM provider support (OpenAI, Anthropic, Groq, etc.)
- Real-time document indexing and search
- Role-based access control (RBAC)
- Custom AI assistants/agents
- Enterprise security features
- Scalable deployment options