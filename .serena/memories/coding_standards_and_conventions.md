# Onyx Coding Standards and Conventions

## General Development Philosophy

### FAANG-Inspired Methodology
1. **Documentation-First Development**: Create technical design docs in `/dev_plan/` before coding
2. **Test-Driven Development (TDD)**: Write tests before implementation
3. **Incremental Development**: Break features into small, discrete tasks
4. **Code Quality Gates**: Automated linting, formatting, type checking

### Quality Checklist (Before marking tasks complete)
- [ ] Tests written and passing
- [ ] Code follows project conventions  
- [ ] Linting and type checking pass
- [ ] Documentation updated if needed
- [ ] No hardcoded values or credentials
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security implications reviewed

## Backend Standards (Python)

### Code Style
- **Formatter**: Black (line length: 88 characters)
- **Linter**: Ruff
- **Type Checker**: MyPy with strict mode
- **Import Organization**: isort compatible with Black

### Naming Conventions
- **Functions/Variables**: snake_case (e.g., `get_user_data`)
- **Classes**: PascalCase (e.g., `UserManager`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Private Methods**: Leading underscore (e.g., `_internal_method`)

### Type Hints
- **Mandatory**: All function parameters and return types
- **Collections**: Use generic types (`list[str]`, not `List[str]`)
- **Optional**: Use `| None` syntax (e.g., `str | None`)
- **Complex Types**: Define TypedDict or Pydantic models

### Error Handling
- **HTTP Exceptions**: Use FastAPI HTTPException with proper status codes
- **Logging**: Use structured logging with context information
- **Validation**: Pydantic models for API request/response validation
- **Never**: Suppress exceptions silently

### Example Backend Code:
```python
from typing import Optional
from pydantic import BaseModel
from fastapi import HTTPException

class UserRequest(BaseModel):
    name: str
    email: str | None = None

async def create_user(user_data: UserRequest) -> dict[str, str]:
    """Create a new user with validation."""
    try:
        # Implementation here
        return {"id": "user_123", "status": "created"}
    except ValidationError as e:
        logger.error(f"User validation failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid user data")
```

## Frontend Standards (TypeScript/React)

### Code Style  
- **Formatter**: Prettier
- **Linter**: ESLint with TypeScript rules
- **React**: Function components with hooks
- **Styling**: Tailwind CSS with custom design tokens

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase starting with "use" (e.g., `useUserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Files**: camelCase for utilities, PascalCase for components

### TypeScript Standards
- **Strict Mode**: Enabled in tsconfig.json
- **Interface vs Type**: Use interface for object shapes, type for unions
- **Props**: Define explicit interfaces for component props
- **State**: Type all useState and useReducer hooks

### React Patterns
- **Hooks**: Prefer hooks over class components
- **State Management**: Local state with useState/useContext, complex state with Redux/Zustand
- **Side Effects**: useEffect with proper dependency arrays
- **Memoization**: Use useMemo/useCallback for expensive operations

### Example Frontend Code:
```typescript
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userId, 
  onUpdate 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await userApi.getUser(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <div>User not found</div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
};
```

## File Organization

### Backend Structure
```
backend/
├── onyx/
│   ├── server/          # API endpoints
│   ├── db/             # Database models and operations  
│   ├── llm/            # LLM provider integrations
│   ├── connectors/     # Data source connectors
│   └── utils/          # Shared utilities
├── model_server/       # AI/ML model server
├── tests/             # Test files (mirror source structure)
└── scripts/           # Development and deployment scripts
```

### Frontend Structure  
```
web/src/
├── app/               # Next.js app router pages
├── components/        # Reusable UI components
│   ├── ui/           # Basic UI primitives
│   └── layout/       # Layout components
├── lib/              # Utilities and API clients
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions
```

## Testing Standards

### Backend Testing
- **Framework**: pytest with fixtures
- **Coverage**: Minimum 80% for critical paths
- **Structure**: Mirror source code structure in `tests/` directory
- **Mocking**: Use pytest-mock for external dependencies
- **Database**: Use test database with automatic cleanup

### Frontend Testing
- **Framework**: Jest with React Testing Library
- **Components**: Test user interactions, not implementation details
- **Integration**: Test complete user workflows
- **E2E**: Playwright for critical user journeys
- **Mocking**: Mock API calls and external services

## Git Conventions

### Commit Messages
```
type(scope): description

feat(llm): add Groq provider integration
fix(auth): handle expired tokens correctly  
docs(api): update endpoint documentation
test(user): add user creation tests
refactor(db): optimize query performance
```

### Branch Naming
- **Feature**: `feature/add-groq-provider`
- **Bug Fix**: `fix/auth-token-expiry`
- **Documentation**: `docs/api-reference`
- **Refactoring**: `refactor/optimize-queries`

## Security Standards

### Backend Security
- **Input Validation**: All user inputs validated with Pydantic
- **SQL Injection**: Use SQLAlchemy ORM, avoid raw queries
- **Authentication**: JWT tokens with proper expiration
- **Secrets**: Environment variables, never hardcoded
- **API Rate Limiting**: Implement rate limiting on public endpoints

### Frontend Security  
- **XSS Prevention**: Sanitize user-generated content
- **CSRF Protection**: Proper token handling
- **Sensitive Data**: Never log API keys or passwords
- **Dependencies**: Regular security audits with npm audit