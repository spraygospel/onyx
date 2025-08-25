# CLAUDE.md - Onyx Development Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with the Onyx document processing platform.

## Onyx Development Guidelines

### Development Setup

See `DEVELOPMENT.md` for detailed setup instructions. Quick reference:

**Start Development Mode:**
```bash
# Terminal 1: Docker dependencies
cd deployment/docker_compose
docker compose -f docker-compose.dev.yml -p onyx-stack up -d

# Terminal 2: Model server
cd backend && uvicorn model_server.main:app --reload --port 9001

# Terminal 3: Background jobs  
cd backend && python ./scripts/dev_run_background_jobs.py

# Terminal 4: API server
cd backend && AUTH_TYPE=disabled uvicorn onyx.main:app --reload --port 8080

# Terminal 5: Frontend
cd web && npm run dev
```

**Ports:**
- Frontend: 9000 (custom for reverse proxy)
- Backend API: 8080
- Model Server: 9001

## AI-Assisted Development Methodology (FAANG Best Practices)

### Core Principles

**1. Documentation-First Development**
- ALWAYS start with a technical design document or development plan
- Create plans in `/dev_plan/` with naming convention `X.Y_featureName.md`
- Document the architecture, subsystems, and integration points BEFORE coding
- This front-loads the thinking and reduces implementation errors

**2. Test-Driven Development (TDD)**
- Write tests FIRST, before implementing features
- Use AI to generate comprehensive test cases
- Tests serve as specifications for the feature
- Only implement code after tests are defined

**3. Incremental Development**
- Break features into small, discrete tasks
- Implement one subsystem at a time
- Each task should be independently testable
- Commit frequently with clear, atomic changes

### Development Workflow

**Phase 1: Planning & Design**
```
1. Create technical design document in /dev_plan/
2. Define system architecture and components
3. Identify integration points and dependencies
4. Document data flow and state management
5. Get design review (user feedback) before coding
```

**Phase 2: Task Breakdown**
```
1. Convert design into discrete, actionable tasks
2. Create task list with clear acceptance criteria
3. Prioritize tasks by dependencies
4. Estimate complexity for each task
```

**Phase 3: Test-First Implementation**
```
1. Write unit tests for the feature/component
2. Write integration tests for system interactions
3. Implement minimal code to pass tests
4. Refactor for clarity and performance
5. Ensure all tests pass before moving on
```

**Phase 4: Code Review & Validation**
```
1. Self-review code for quality and standards
2. Run linting and type checking
3. Verify test coverage
4. Document any deviations from plan
5. Submit for review with clear PR description
```

### AI Coding Assistant Guidelines

**When asked to implement a feature:**

1. **FIRST** - Request or create a technical design document
   - Ask: "What problem are we solving?"
   - Ask: "What are the acceptance criteria?"
   - Create a plan document if none exists

2. **SECOND** - Write comprehensive tests
   - Unit tests for individual functions
   - Integration tests for component interactions
   - Edge case tests for error handling

3. **THIRD** - Implement incrementally
   - Start with minimal viable implementation
   - Add features one at a time
   - Keep each change atomic and testable

4. **ALWAYS** - Follow existing patterns
   - Study existing code structure first
   - Match coding style and conventions
   - Use existing utilities and helpers
   - Don't reinvent what already exists

### Quality Checklist

Before marking any task complete:
- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] Linting and type checking pass
- [ ] Documentation updated if needed
- [ ] No hardcoded values or credentials
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security implications reviewed

### Communication Style

- Be explicit about what phase of development we're in
- Always show the plan before implementing
- Explain architectural decisions and trade-offs
- Flag any deviations from best practices with reasoning
- Suggest improvements to existing code when relevant

## Project Structure

**Key Directories:**
- `/backend` - Python FastAPI server with AI/ML capabilities
- `/web` - Next.js React frontend
- `/deployment` - Docker compose configurations
- `/dev_plan` - Development planning documents

**Technology Stack:**
- Backend: Python 3.11+, FastAPI, SQLAlchemy, Alembic
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Database: PostgreSQL
- Search: Vespa
- Storage: MinIO (S3-compatible)
- AI/ML: LiteLLM, Transformers, local model server

# Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## FAANG-Inspired Development Standards

### Architecture Before Code
- Technical design documents are mandatory
- Architecture decisions must be documented
- System integration points must be identified upfront
- Data flow and state management must be planned

### Testing as Specification
- Tests are written before code (TDD)
- Tests serve as living documentation
- Edge cases are identified during test writing
- Coverage targets: >80% for critical paths

### Incremental Delivery
- Features delivered in small, working increments
- Each increment is independently deployable
- Continuous integration with frequent commits
- Feature flags for gradual rollout

### Code Quality Gates
- Automated linting and formatting
- Type safety enforcement
- Security scanning
- Performance benchmarking
- Two-reviewer approval process (when working in teams)

This methodology has shown ~30% improvement in delivery speed from proposal to production at FAANG companies.