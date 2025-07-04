import React from "react";
import { AppProvider } from "./context/AppContext";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import Results from "./components/Results";
import { useApp } from "./context/AppContext";
import "./App.css";

const AppContent: React.FC = () => {
	const { state } = useApp();

	// Determine which component to render based on app state
	if (state.currentSession && !state.currentSession.endTime) {
		return <Quiz />;
	}

	if (state.currentSession && state.currentSession.endTime) {
		return <Results />;
	}

	return <Home />;
};

const App: React.FC = () => {
	return (
		<AppProvider>
			<div className="App">
				<AppContent />
			</div>
		</AppProvider>
	);
};

export default App;
