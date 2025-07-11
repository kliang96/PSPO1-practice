import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "../components/Home";
import Quiz from "../components/Quiz";
import Results from "../components/Results";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter: React.FC = () => {
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
				{/* Catch all other routes and redirect to home */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
};

export default AppRouter;
