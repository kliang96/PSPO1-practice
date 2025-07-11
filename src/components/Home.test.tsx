import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "./Home";
import { AppProvider } from "../context/AppContext";
import { BrowserRouter } from "react-router-dom";

// Mock the utils functions
jest.mock("../utils/quizUtils", () => ({
	loadTopics: jest.fn(() =>
		Promise.resolve([
			{
				id: "scrum-theory",
				name: "Scrum Theory",
				questionCount: 16,
				weight: 12,
				description: "Test",
				subtopics: [],
			},
			{
				id: "scrum-events",
				name: "Scrum Events",
				questionCount: 20,
				weight: 20,
				description: "Test",
				subtopics: [],
			},
			{
				id: "scrum-artifacts",
				name: "Scrum Artifacts",
				questionCount: 20,
				weight: 15,
				description: "Test",
				subtopics: [],
			},
		])
	),
	loadQuestions: jest.fn(() => Promise.resolve([])),
	generateQuiz: jest.fn(() => []),
	getTopicName: jest.fn(() => "Test Topic"),
}));

jest.mock("../utils/storageUtils", () => ({
	progressStorage: {
		load: jest.fn(() => null),
		save: jest.fn(),
	},
	isFileSystemAccessSupported: jest.fn(() => false),
}));

jest.mock("../utils/sessionUtils", () => ({
	generateSessionId: jest.fn(() => "test-session-id"),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<BrowserRouter>
		<AppProvider>{children}</AppProvider>
	</BrowserRouter>
);

describe("Home Component Topic Validation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should show validation error when requesting more questions than available", async () => {
		render(
			<TestWrapper>
				<Home />
			</TestWrapper>
		);

		// Wait for topics to load
		await waitFor(() => {
			expect(screen.getByText("Scrum Theory")).toBeInTheDocument();
		});

		// Uncheck all topics first
		const allTopicCheckboxes = screen.getAllByRole(
			"checkbox"
		) as HTMLInputElement[];
		const topicCheckboxes = allTopicCheckboxes.filter(
			(checkbox) =>
				checkbox.getAttribute("type") === "checkbox" &&
				!checkbox.classList.contains("focus-weak-areas")
		);

		// Uncheck all topics
		topicCheckboxes.forEach((checkbox) => {
			if (checkbox.checked) {
				fireEvent.click(checkbox);
			}
		});

		// Select only Scrum Theory (16 questions)
		const scrumTheoryCheckbox = screen.getByLabelText(/Scrum Theory/);
		fireEvent.click(scrumTheoryCheckbox);

		// Change question count to 40
		const questionCountSelect = screen.getByLabelText(/Number of Questions/);
		fireEvent.change(questionCountSelect, { target: { value: "40" } });

		// Check that validation error appears
		await waitFor(() => {
			expect(
				screen.getByText(/Not enough questions available!/)
			).toBeInTheDocument();
			expect(
				screen.getByText(
					/Selected topics have 16 questions, but you requested 40/
				)
			).toBeInTheDocument();
		});

		// Check that start button is disabled
		const startButton = screen.getByRole("button", { name: /Start/ });
		expect(startButton).toBeDisabled();
	});

	it("should not show validation error when enough questions are available", async () => {
		render(
			<TestWrapper>
				<Home />
			</TestWrapper>
		);

		// Wait for topics to load
		await waitFor(() => {
			expect(screen.getByText("Scrum Theory")).toBeInTheDocument();
		});

		// Select multiple topics (total should be > 40 questions)
		const scrumTheoryCheckbox = screen.getByLabelText(/Scrum Theory/);
		const scrumEventsCheckbox = screen.getByLabelText(/Scrum Events/);
		const scrumArtifactsCheckbox = screen.getByLabelText(/Scrum Artifacts/);

		fireEvent.click(scrumTheoryCheckbox);
		fireEvent.click(scrumEventsCheckbox);
		fireEvent.click(scrumArtifactsCheckbox);

		// Change question count to 40
		const questionCountSelect = screen.getByLabelText(/Number of Questions/);
		fireEvent.change(questionCountSelect, { target: { value: "40" } });

		// Check that no validation error appears
		await waitFor(() => {
			expect(
				screen.queryByText(/Not enough questions available!/)
			).not.toBeInTheDocument();
		});

		// Check that start button is enabled
		const startButton = screen.getByRole("button", { name: /Start/ });
		expect(startButton).not.toBeDisabled();
	});

	it("should show validation error when no topics are selected", async () => {
		render(
			<TestWrapper>
				<Home />
			</TestWrapper>
		);

		// Wait for topics to load
		await waitFor(() => {
			expect(screen.getByText("Scrum Theory")).toBeInTheDocument();
		});

		// Uncheck all topics
		const allTopicCheckboxes = screen.getAllByRole(
			"checkbox"
		) as HTMLInputElement[];
		const topicCheckboxes = allTopicCheckboxes.filter(
			(checkbox) =>
				checkbox.getAttribute("type") === "checkbox" &&
				!checkbox.classList.contains("focus-weak-areas")
		);

		topicCheckboxes.forEach((checkbox) => {
			if (checkbox.checked) {
				fireEvent.click(checkbox);
			}
		});

		// Check that validation error appears
		await waitFor(() => {
			expect(
				screen.getByText(/Please select at least one topic to study/)
			).toBeInTheDocument();
		});

		// Check that start button is disabled
		const startButton = screen.getByRole("button", { name: /Start/ });
		expect(startButton).toBeDisabled();
	});
});
