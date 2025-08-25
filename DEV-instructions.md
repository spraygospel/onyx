# DEV-instructions.md
## FAANG AI Development Method (Simple Guide)

---

## 🎯 Core Idea: Plan → Test → Code

Like building LEGO: Plan the castle, then build piece by piece.

---

## 📋 The 4-Step Method

### 1. Plan First (Design Doc)
**What**: Write what you're building before coding
**Why**: Fixes problems on paper (cheap) vs in code (expensive)
**How**: 
- What problem are we solving?
- How will we solve it?
- What pieces do we need?
- How do pieces connect?

### 2. Tests First 
**What**: Write tests before writing code
**Why**: Defines what "success" looks like
**How**:
```python
# Example: AI writes tests first
def test_calculate_age():
    assert calculate_age("2000-01-01") == 24  # Normal
    assert calculate_age("invalid") == None    # Error case
```

### 3. Small Steps
**What**: Build one tiny piece at a time  
**Why**: Easy to debug, less overwhelming
**How**: Break big features into 1-hour tasks

### 4. Review & Clean
**What**: Check your work, clean up code
**Why**: Catch mistakes, improve readability
**How**: Run tests, lint, review, commit

---

## 🚀 Daily Workflow

```
1. Pick small task from plan
2. Write test for that task  
3. Write minimal code to pass test
4. Clean up and review
5. Commit and move to next task
```

---

## 💡 Working with AI

### AI is GREAT for:
- Writing tests quickly
- Finding edge cases you missed
- Generating boilerplate code
- Helping with planning

### AI Needs Help with:
- Complex business logic (review carefully)
- Security code (always double-check)
- Performance optimization (benchmark results)

---

## ✅ Quality Checklist

Before finishing any task:
- [ ] Tests written and passing
- [ ] Code follows project patterns  
- [ ] Linting passes
- [ ] No hardcoded values
- [ ] Error handling included

---

## ❌ Common Mistakes

1. **Jumping to code** → Always plan first
2. **Building everything at once** → Small steps only
3. **Code before tests** → Tests define success
4. **Vague AI requests** → Be specific

---

## 🎯 Example: Adding Like Button

**Old Way** (5.5 hours):
Plan → Code → Fix bugs → Write tests

**FAANG Way** (2.5 hours):
Plan with AI → AI writes tests → Code to pass tests → AI reviews

**30% faster!**

---

## 📖 Summary

**Think like an architect, build like a craftsman:**
1. Design first
2. Test first  
3. Small steps
4. Quality gates

*Good software = Clear thinking + Good planning + Systematic building*