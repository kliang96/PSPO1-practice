import { QuizSession } from "../types";

// Generate a unique session ID
export const generateSessionId = (): string => {
	return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Validate session ID format
export const isValidSessionId = (id: string): boolean => {
	return /^session_\d+_[a-z0-9]{9}$/.test(id);
};

// Session storage keys
export const getSessionStorageKey = (sessionId: string): string => {
	return `pspo-session-${sessionId}`;
};

// Save session to localStorage
export const saveSessionToStorage = (session: QuizSession): void => {
	const sessionKey = getSessionStorageKey(session.id);
	const sessionData = {
		...session,
		startTime: session.startTime.toISOString(),
		endTime: session.endTime?.toISOString(),
	};
	localStorage.setItem(sessionKey, JSON.stringify(sessionData));
};

// Load session from localStorage
export const loadSessionFromStorage = (
	sessionId: string
): QuizSession | null => {
	const sessionKey = getSessionStorageKey(sessionId);
	const savedSession = localStorage.getItem(sessionKey);

	if (!savedSession) {
		return null;
	}

	try {
		const sessionData = JSON.parse(savedSession);
		return {
			...sessionData,
			startTime: new Date(sessionData.startTime),
			endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
		};
	} catch (error) {
		console.error("Failed to parse session data:", error);
		return null;
	}
};

// Clear session from localStorage
export const clearSessionFromStorage = (sessionId: string): void => {
	const sessionKey = getSessionStorageKey(sessionId);
	localStorage.removeItem(sessionKey);
};

// Get all active session IDs
export const getActiveSessions = (): string[] => {
	const sessions: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith("pspo-session-")) {
			const sessionId = key.replace("pspo-session-", "");
			sessions.push(sessionId);
		}
	}
	return sessions;
};

// Clean up expired sessions (older than 24 hours)
export const cleanupExpiredSessions = (): void => {
	const now = Date.now();
	const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	getActiveSessions().forEach((sessionId) => {
		const session = loadSessionFromStorage(sessionId);
		if (session && now - session.startTime.getTime() > maxAge) {
			clearSessionFromStorage(sessionId);
			console.log(`Cleaned up expired session: ${sessionId}`);
		}
	});
};

// Get session info for debugging
export const getSessionInfo = (
	sessionId: string
): { exists: boolean; isValid: boolean; isExpired: boolean } => {
	const exists = !!loadSessionFromStorage(sessionId);
	const isValid = isValidSessionId(sessionId);
	let isExpired = false;

	if (exists) {
		const session = loadSessionFromStorage(sessionId);
		if (session) {
			const now = Date.now();
			const maxAge = 24 * 60 * 60 * 1000; // 24 hours
			isExpired = now - session.startTime.getTime() > maxAge;
		}
	}

	return { exists, isValid, isExpired };
};

// Optimize storage by removing old sessions
export const optimizeSessionStorage = (): void => {
	const activeSessions = getActiveSessions();
	const maxSessions = 5; // Keep only the 5 most recent sessions

	if (activeSessions.length > maxSessions) {
		// Sort sessions by start time (most recent first)
		const sessionsWithTime = activeSessions
			.map((sessionId) => ({
				sessionId,
				session: loadSessionFromStorage(sessionId),
			}))
			.filter(({ session }) => session !== null)
			.sort(
				(a, b) =>
					b.session!.startTime.getTime() - a.session!.startTime.getTime()
			);

		// Remove older sessions
		const sessionsToRemove = sessionsWithTime.slice(maxSessions);
		sessionsToRemove.forEach(({ sessionId }) => {
			clearSessionFromStorage(sessionId);
			console.log(`Removed old session for storage optimization: ${sessionId}`);
		});
	}
};

// Get storage usage stats
export const getStorageStats = (): {
	sessionCount: number;
	storageKeys: string[];
} => {
	const activeSessions = getActiveSessions();
	const sessionKeys = activeSessions.map((id) => getSessionStorageKey(id));

	return {
		sessionCount: activeSessions.length,
		storageKeys: sessionKeys,
	};
};
