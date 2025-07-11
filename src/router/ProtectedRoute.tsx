import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
	isValidSessionId,
	loadSessionFromStorage,
} from "../utils/sessionUtils";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { sessionId } = useParams<{ sessionId: string }>();
	const { state } = useApp();

	// Validate session ID format
	if (!sessionId || !isValidSessionId(sessionId)) {
		console.warn("Invalid session ID format:", sessionId);
		return <Navigate to="/" replace />;
	}

	// Check if session exists in state or storage
	if (!state.currentSession || state.currentSession.id !== sessionId) {
		const savedSession = loadSessionFromStorage(sessionId);
		if (!savedSession) {
			console.warn("Session not found:", sessionId);
			return <Navigate to="/" replace />;
		}
	}

	return <>{children}</>;
};

export default ProtectedRoute;
