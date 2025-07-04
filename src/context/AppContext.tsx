import React, { createContext, useContext, useReducer, useEffect } from "react";
import {
	AppState,
	QuizSession,
	UserProgress,
	QuizSettings,
	UserAnswer,
	DraftAnswer,
	QuestionStatus,
	StoragePreferences,
	QuizSessionResult,
} from "../types";
import {
	progressStorage,
	loadStoragePreferences,
	saveStoragePreferences,
	defaultStoragePreferences,
	cleanupCorruptedProgress,
} from "../utils/storageUtils";

// Utility function to calculate time limit based on PSPO format (80 questions = 60 minutes)
const calculateTimeLimit = (questionCount: number): number => {
	return Math.round((questionCount / 80) * 60);
};

// Initial state
const initialState: AppState = {
	currentSession: null,
	userProgress: null,
	settings: {
		questionCount: 10,
		timeLimit: calculateTimeLimit(10), // 7.5 minutes for 10 questions
		includeExplanations: true,
		focusWeakAreas: false,
		topics: [],
	},
	storagePreferences: defaultStoragePreferences,
	isPaused: false,
	remainingTime: undefined,
};

// Action types
type AppAction =
	| { type: "START_SESSION"; payload: QuizSession }
	| { type: "END_SESSION"; payload: { score: number; totalTime: number } }
	| { type: "ANSWER_QUESTION"; payload: UserAnswer }
	| { type: "SAVE_DRAFT_ANSWER"; payload: DraftAnswer }
	| { type: "NAVIGATE_TO_QUESTION"; payload: number }
	| { type: "UPDATE_QUESTION_STATUS"; payload: QuestionStatus }
	| { type: "SUBMIT_EXAM"; payload: UserAnswer[] }
	| { type: "PAUSE_SESSION" }
	| { type: "RESUME_SESSION" }
	| { type: "UPDATE_PROGRESS"; payload: UserProgress }
	| { type: "UPDATE_SETTINGS"; payload: Partial<QuizSettings> }
	| { type: "UPDATE_REMAINING_TIME"; payload: number }
	| { type: "LOAD_PROGRESS"; payload: UserProgress }
	| { type: "CLEAR_SESSION" }
	| { type: "UPDATE_STORAGE_PREFERENCES"; payload: Partial<StoragePreferences> }
	| { type: "SAVE_SESSION_RESULT"; payload: QuizSessionResult };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "START_SESSION":
			const initialQuestionStatuses: QuestionStatus[] =
				action.payload.questions.map((q) => ({
					questionId: q.id,
					isAnswered: false,
					isVisited: false,
				}));

			return {
				...state,
				currentSession: {
					...action.payload,
					questionStatuses: initialQuestionStatuses,
					draftAnswers: [],
					currentQuestionIndex: 0,
				},
				isPaused: false,
				remainingTime: state.settings.timeLimit
					? state.settings.timeLimit * 60
					: undefined,
			};

		case "END_SESSION":
			if (!state.currentSession) return state;
			return {
				...state,
				currentSession: {
					...state.currentSession,
					endTime: new Date(),
					totalTime: action.payload.totalTime,
					score: action.payload.score,
				},
			};

		case "ANSWER_QUESTION":
			if (!state.currentSession) return state;
			return {
				...state,
				currentSession: {
					...state.currentSession,
					answers: [...state.currentSession.answers, action.payload],
				},
			};

		case "SAVE_DRAFT_ANSWER":
			if (!state.currentSession) return state;

			const existingDraftIndex =
				state.currentSession.draftAnswers?.findIndex(
					(draft) => draft.questionId === action.payload.questionId
				) ?? -1;

			let updatedDraftAnswers = [...(state.currentSession.draftAnswers || [])];
			if (existingDraftIndex >= 0) {
				updatedDraftAnswers[existingDraftIndex] = action.payload;
			} else {
				updatedDraftAnswers.push(action.payload);
			}

			// Update question status
			const updatedStatuses =
				state.currentSession.questionStatuses?.map((status) =>
					status.questionId === action.payload.questionId
						? {
								...status,
								isAnswered: true,
								draftAnswer: action.payload.selectedAnswer,
						  }
						: status
				) || [];

			return {
				...state,
				currentSession: {
					...state.currentSession,
					draftAnswers: updatedDraftAnswers,
					questionStatuses: updatedStatuses,
				},
			};

		case "NAVIGATE_TO_QUESTION":
			if (!state.currentSession) return state;

			// Mark current question as visited
			const updatedStatusesForNav =
				state.currentSession.questionStatuses?.map((status) =>
					status.questionId ===
					state.currentSession?.questions[action.payload]?.id
						? { ...status, isVisited: true }
						: status
				) || [];

			return {
				...state,
				currentSession: {
					...state.currentSession,
					currentQuestionIndex: action.payload,
					questionStatuses: updatedStatusesForNav,
				},
			};

		case "UPDATE_QUESTION_STATUS":
			if (!state.currentSession) return state;

			const updatedStatusesForUpdate =
				state.currentSession.questionStatuses?.map((status) =>
					status.questionId === action.payload.questionId
						? { ...status, ...action.payload }
						: status
				) || [];

			return {
				...state,
				currentSession: {
					...state.currentSession,
					questionStatuses: updatedStatusesForUpdate,
				},
			};

		case "SUBMIT_EXAM":
			if (!state.currentSession) return state;
			return {
				...state,
				currentSession: {
					...state.currentSession,
					answers: action.payload,
				},
			};

		case "PAUSE_SESSION":
			return {
				...state,
				isPaused: true,
			};

		case "RESUME_SESSION":
			return {
				...state,
				isPaused: false,
			};

		case "UPDATE_PROGRESS":
			return {
				...state,
				userProgress: action.payload,
			};

		case "UPDATE_SETTINGS":
			const updatedSettings = { ...state.settings, ...action.payload };
			// Automatically calculate time limit if question count changes
			if (action.payload.questionCount !== undefined) {
				updatedSettings.timeLimit = calculateTimeLimit(
					action.payload.questionCount
				);
			}
			return {
				...state,
				settings: updatedSettings,
			};

		case "UPDATE_REMAINING_TIME":
			return {
				...state,
				remainingTime: action.payload,
			};

		case "LOAD_PROGRESS":
			// Fix any corrupted data where totalSessions doesn't match sessionHistory.length
			const fixedProgress = {
				...action.payload,
				totalSessions: action.payload.sessionHistory.length,
			};

			return {
				...state,
				userProgress: fixedProgress,
			};

		case "UPDATE_STORAGE_PREFERENCES":
			const updatedStoragePreferences = {
				...state.storagePreferences,
				...action.payload,
			};
			return {
				...state,
				storagePreferences: updatedStoragePreferences,
			};

		case "SAVE_SESSION_RESULT":
			if (!state.userProgress) {
				return state;
			}

			// Check if this session already exists to prevent duplicates
			const sessionExists = state.userProgress.sessionHistory.some(
				(session) => session.id === action.payload.id
			);

			if (sessionExists) {
				// Session already saved, don't save again
				return state;
			}

			const updatedSessionHistory = [
				...state.userProgress.sessionHistory,
				action.payload,
			].slice(-state.storagePreferences.maxSessionHistory);

			// Update streak data
			const today = new Date();
			const lastStudyDate = new Date(
				state.userProgress.streakData.lastStudyDate
			);
			const daysDifference = Math.floor(
				(today.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			let currentStreak = state.userProgress.streakData.currentStreak;
			if (daysDifference === 0) {
				// Same day - maintain streak
			} else if (daysDifference === 1) {
				// Next day - increment streak
				currentStreak++;
			} else {
				// Gap in days - reset streak
				currentStreak = 1;
			}

			const updatedProgress = {
				...state.userProgress,
				sessionHistory: updatedSessionHistory,
				// Compute totalSessions from actual session history length
				totalSessions: updatedSessionHistory.length,
				streakData: {
					...state.userProgress.streakData,
					currentStreak,
					longestStreak: Math.max(
						currentStreak,
						state.userProgress.streakData.longestStreak
					),
					lastStudyDate: today,
				},
			};

			return {
				...state,
				userProgress: updatedProgress,
			};

		case "CLEAR_SESSION":
			return {
				...state,
				currentSession: null,
				isPaused: false,
				remainingTime: undefined,
			};

		default:
			return state;
	}
}

// Context
const AppContext = createContext<{
	state: AppState;
	dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [state, dispatch] = useReducer(appReducer, initialState);

	// Load storage preferences and progress on mount
	useEffect(() => {
		const initializeStorage = async () => {
			try {
				// Clean up any corrupted progress data first
				await cleanupCorruptedProgress();

				// Load storage preferences
				const storagePreferences = loadStoragePreferences();
				dispatch({
					type: "UPDATE_STORAGE_PREFERENCES",
					payload: storagePreferences,
				});

				// Update progress storage instance with preferences
				progressStorage.updatePreferences(storagePreferences);

				// Load progress using the new storage system
				const progress = await progressStorage.loadProgress();
				if (progress) {
					dispatch({ type: "LOAD_PROGRESS", payload: progress });
				}

				// Load settings from localStorage (legacy)
				const savedSettings = localStorage.getItem("pspo-settings");
				if (savedSettings) {
					try {
						const settings = JSON.parse(savedSettings);
						dispatch({ type: "UPDATE_SETTINGS", payload: settings });
					} catch (error) {
						console.error("Failed to load settings:", error);
					}
				}
			} catch (error) {
				console.error("Failed to initialize storage:", error);
			}
		};

		initializeStorage();
	}, []);

	// Save progress using the new storage system when it changes
	useEffect(() => {
		if (state.userProgress) {
			progressStorage.saveProgress(state.userProgress).catch((error) => {
				console.error("Failed to save progress:", error);
			});
		}
	}, [state.userProgress]);

	// Save settings to localStorage when they change
	useEffect(() => {
		localStorage.setItem("pspo-settings", JSON.stringify(state.settings));
	}, [state.settings]);

	// Save storage preferences when they change
	useEffect(() => {
		saveStoragePreferences(state.storagePreferences);
		progressStorage.updatePreferences(state.storagePreferences);
	}, [state.storagePreferences]);

	return (
		<AppContext.Provider value={{ state, dispatch }}>
			{children}
		</AppContext.Provider>
	);
};

// Custom hook to use the context
export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp must be used within an AppProvider");
	}
	return context;
};
