import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

test("renders PSPO Study App home page", async () => {
	render(<App />);

	// Wait for the loading to complete and check for home page content
	await waitFor(() => {
		expect(screen.getByText(/PSPO 1 Study App/i)).toBeInTheDocument();
	});
});
