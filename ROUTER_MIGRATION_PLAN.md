# React Router Migration Plan - PSPO Study App

## Overview

This document outlines the step-by-step migration from conditional rendering to React Router for the PSPO Study App. This migration will follow industry standards and solve the page refresh issue while maintaining all existing functionality.

## Current Architecture Analysis

### Current State Management

- **Conditional Rendering**: Based on `currentSession` state in App.tsx
- **Session Persistence**: localStorage and File System Access API
- **State Management**: React Context with useReducer
- **Navigation Logic**:
  - `currentSession === null` → Home
  - `currentSession && !endTime` → Quiz
  - `currentSession && endTime` → Results

### Current Issues

- Page refresh loses session state
- No browser history support
- No bookmarkable URLs
- Not following React community standards

## Migration Strategy

### Phase 1: Setup and Dependencies

**Estimated Time**: 30 minutes

#### Step 1.1: Install React Router

```bash
npm install react-router-dom@6
npm install --save-dev @types/react-router-dom
```

#### Step 1.2: Update package.json

- Verify React Router installation
- Check for any peer dependency warnings

#### Step 1.3: Plan URL Structure

```
/ (Home page)
/quiz/:sessionId (Active quiz)
/results/:sessionId (Results page)
```

### Phase 2: Core Router Implementation

**Estimated Time**: 1 hour

#### Step 2.1: Create Router Configuration

- Create `src/router/AppRouter.tsx`
- Set up BrowserRouter with routes
- Import existing components

#### Step 2.2: Update App.tsx

- Remove conditional rendering logic
- Integrate Router component
- Maintain AppProvider wrapper

#### Step 2.3: Create Route Protection

- Add route guards for quiz and results pages
- Handle invalid session IDs
- Redirect to home if session doesn't exist

### Phase 3: Session Management Refactor

**Estimated Time**: 1.5 hours

#### Step 3.1: Update AppContext

- Add new actions for URL-based navigation
- Modify session creation to include URL navigation
- Add session validation by ID

#### Step 3.2: Session ID Management

- Generate unique session IDs
- Store session mapping in localStorage
- Clean up expired sessions

#### Step 3.3: Update Session Persistence

- Modify storage utilities to handle session by ID
- Add session cleanup mechanisms
- Maintain backward compatibility

### Phase 4: Component Updates

**Estimated Time**: 2 hours

#### Step 4.1: Update Home Component

- Remove direct state transitions
- Use navigation hooks for quiz start
- Generate session ID on quiz creation

#### Step 4.2: Update Quiz Component

- Read session ID from URL params
- Add navigation guards
- Handle invalid session scenarios
- Maintain all existing functionality

#### Step 4.3: Update Results Component

- Read session ID from URL params
- Add proper navigation
- Handle "New Quiz" button navigation

### Phase 5: Navigation and UX Improvements

**Estimated Time**: 1 hour

#### Step 5.1: Add Navigation Hooks

- Use `useNavigate` for programmatic navigation
- Replace direct state updates with navigation
- Add proper error handling

#### Step 5.2: Browser History Support

- Test back/forward buttons
- Handle edge cases (back during quiz)
- Add confirmation dialogs if needed

#### Step 5.3: URL Parameter Validation

- Validate session IDs in URL
- Handle malformed URLs gracefully
- Add loading states

### Phase 6: Enhanced Session Persistence

**Estimated Time**: 1 hour

#### Step 6.1: Session Recovery

- Implement crash recovery for active sessions
- Restore session state from localStorage
- Handle partial session data

#### Step 6.2: Session Cleanup

- Auto-cleanup expired sessions
- Remove old session data
- Optimize storage usage

### Phase 7: Testing and Validation

**Estimated Time**: 1 hour

#### Step 7.1: Functionality Testing

- Test all user flows
- Verify page refresh behavior
- Test browser back/forward buttons

#### Step 7.2: Edge Case Testing

- Invalid URLs
- Expired sessions
- Corrupted session data
- Network issues

#### Step 7.3: Performance Testing

- Check for memory leaks
- Verify storage efficiency
- Test with large session histories

### Phase 8: Documentation and Cleanup

**Estimated Time**: 30 minutes

#### Step 8.1: Code Cleanup

- Remove unused imports
- Clean up commented code
- Update component documentation

#### Step 8.2: Update README

- Document new URL structure
- Add development notes
- Update any build instructions

---

## Detailed Implementation Steps

### Phase 1: Setup and Dependencies

#### 1.1 Install Dependencies

```bash
npm install react-router-dom@6
```

#### 1.2 Create Router Structure

Create `src/router/AppRouter.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../components/Home";
import Quiz from "../components/Quiz";
import Results from "../components/Results";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route
					path="/quiz/:sessionId"
					element={
						<ProtectedRoute>
							<Quiz />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/results/:sessionId"
					element={
						<ProtectedRoute>
							<Results />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
};

export default AppRouter;
```

### Phase 2: Core Router Implementation

#### 2.1 Create Protected Route Component

Create `src/router/ProtectedRoute.tsx`:

```typescript
import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { sessionId } = useParams<{ sessionId: string }>();
	const { state } = useApp();

	// Validate session exists
	if (
		!sessionId ||
		!state.currentSession ||
		state.currentSession.id !== sessionId
	) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
};

export default ProtectedRoute;
```

#### 2.2 Update App.tsx

```typescript
import React from "react";
import { AppProvider } from "./context/AppContext";
import AppRouter from "./router/AppRouter";
import "./App.css";

const App: React.FC = () => {
	return (
		<AppProvider>
			<div className="App">
				<AppRouter />
			</div>
		</AppProvider>
	);
};

export default App;
```

### Phase 3: Session Management Updates

#### 3.1 Update AppContext Actions

Add new actions to `src/context/AppContext.tsx`:

```typescript
type AppAction =
	| { type: "START_SESSION"; payload: QuizSession }
	| { type: "NAVIGATE_TO_QUIZ"; payload: string } // sessionId
	| { type: "NAVIGATE_TO_RESULTS"; payload: string } // sessionId
	| { type: "VALIDATE_SESSION"; payload: string }; // sessionId
// ... existing actions
```

#### 3.2 Session ID Generation

Add utility for session ID generation:

```typescript
// In utils/sessionUtils.ts
export const generateSessionId = (): string => {
	return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidSessionId = (id: string): boolean => {
	return /^session_\d+_[a-z0-9]{9}$/.test(id);
};
```

### Phase 4: Component Updates

#### 4.1 Update Home Component

```typescript
import { useNavigate } from "react-router-dom";
import { generateSessionId } from "../utils/sessionUtils";

const Home: React.FC = () => {
	const navigate = useNavigate();

	const handleStartQuiz = () => {
		const sessionId = generateSessionId();
		// Create session with ID
		dispatch({
			type: "START_SESSION",
			payload: { id: sessionId, ...sessionData },
		});
		navigate(`/quiz/${sessionId}`);
	};

	// ... rest of component
};
```

#### 4.2 Update Quiz Component

```typescript
import { useParams, useNavigate } from "react-router-dom";

const Quiz: React.FC = () => {
	const { sessionId } = useParams<{ sessionId: string }>();
	const navigate = useNavigate();

	// Validate session on mount
	useEffect(() => {
		if (
			!sessionId ||
			!state.currentSession ||
			state.currentSession.id !== sessionId
		) {
			navigate("/", { replace: true });
			return;
		}
	}, [sessionId, state.currentSession, navigate]);

	const handleFinishQuiz = () => {
		// Process results
		navigate(`/results/${sessionId}`);
	};

	// ... rest of component
};
```

#### 4.3 Update Results Component

```typescript
import { useParams, useNavigate } from "react-router-dom";

const Results: React.FC = () => {
	const { sessionId } = useParams<{ sessionId: string }>();
	const navigate = useNavigate();

	const handleNewQuiz = () => {
		dispatch({ type: "CLEAR_SESSION" });
		navigate("/");
	};

	// ... rest of component
};
```

### Phase 5: Session Persistence Enhancement

#### 5.1 Update Storage Utilities

Modify `src/utils/storageUtils.ts`:

```typescript
// Add session-specific storage
export const saveSessionState = (
	sessionId: string,
	session: QuizSession
): void => {
	const sessionKey = `pspo-session-${sessionId}`;
	localStorage.setItem(sessionKey, JSON.stringify(session));
};

export const loadSessionState = (sessionId: string): QuizSession | null => {
	const sessionKey = `pspo-session-${sessionId}`;
	const saved = localStorage.getItem(sessionKey);
	return saved ? JSON.parse(saved) : null;
};

export const clearSessionState = (sessionId: string): void => {
	const sessionKey = `pspo-session-${sessionId}`;
	localStorage.removeItem(sessionKey);
};
```

---

## Risk Assessment and Mitigation

### High Risk Areas

1. **Session State Loss**: Mitigated by comprehensive persistence
2. **URL Parameter Tampering**: Mitigated by session validation
3. **Browser History Confusion**: Mitigated by proper navigation guards

### Medium Risk Areas

1. **Component Re-renders**: Monitor performance during testing
2. **Storage Bloat**: Implement session cleanup mechanisms

### Low Risk Areas

1. **Routing Performance**: React Router is well-optimized
2. **Bundle Size**: React Router adds minimal overhead

---

## Testing Checklist

### Functional Tests

- [ ] Home page loads correctly
- [ ] Quiz can be started and navigated to
- [ ] Page refresh during quiz maintains state
- [ ] Quiz completion navigates to results
- [ ] Results page displays correctly
- [ ] Page refresh on results maintains state
- [ ] "New Quiz" button returns to home
- [ ] Browser back/forward buttons work correctly

### Edge Case Tests

- [ ] Invalid session ID in URL
- [ ] Session ID tampering
- [ ] Expired session handling
- [ ] Corrupted session data
- [ ] Network interruption during session

### Performance Tests

- [ ] No memory leaks
- [ ] Fast navigation between routes
- [ ] Efficient session storage

---

## Success Criteria

### Must Have

- ✅ Page refresh maintains current state
- ✅ Browser navigation works correctly
- ✅ All existing functionality preserved
- ✅ Clean, maintainable code

### Should Have

- ✅ Bookmarkable URLs
- ✅ Proper error handling
- ✅ Session cleanup mechanisms
- ✅ Performance optimization

### Nice to Have

- ✅ Loading states during navigation
- ✅ Breadcrumb navigation
- ✅ URL parameter validation
- ✅ Enhanced UX feedback

---

## Rollback Plan

If migration fails:

1. Revert to git commit before migration
2. Remove React Router dependency
3. Restore original App.tsx
4. Test original functionality

## Estimated Total Time: 7-8 hours

- Setup: 30 min
- Core Implementation: 1 hour
- Session Management: 1.5 hours
- Component Updates: 2 hours
- Navigation/UX: 1 hour
- Session Persistence: 1 hour
- Testing: 1 hour
- Documentation: 30 min

## Next Steps

1. Review and approve this plan
2. Create backup branch
3. Begin Phase 1 implementation
4. Test each phase thoroughly before proceeding
5. Document any deviations from plan
