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
