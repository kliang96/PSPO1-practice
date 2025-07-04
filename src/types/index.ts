export interface Topic {
	id: string;
	name: string;
	description: string;
	weight: number;
	subtopics: string[];
}

export interface Question {
	id: number;
	topic: string;
	difficulty: "easy" | "medium" | "hard";
	type: "single" | "multiple";
	question: string;
	options: string[];
	correctAnswer: number | number[];
	explanation: string;
}

export interface UserAnswer {
	questionId: number;
	selectedAnswer: number | number[];
	isCorrect: boolean;
	timeSpent: number;
}

// New interface for draft answers during exam
export interface DraftAnswer {
	questionId: number;
	selectedAnswer: number | number[];
	timeSpent: number;
}

// New interface for question status tracking
export interface QuestionStatus {
	questionId: number;
	isAnswered: boolean;
	isVisited: boolean;
	draftAnswer?: number | number[];
}

export interface QuizSession {
	id: string;
	mode: "study" | "exam";
	startTime: Date;
	endTime?: Date;
	questions: Question[];
	answers: UserAnswer[];
	draftAnswers?: DraftAnswer[]; // For exam mode - temporary answers before submission
	questionStatuses?: QuestionStatus[]; // Track question status for navigation
	currentQuestionIndex?: number; // Track current question for navigation
	totalTime?: number;
	score?: number;
	topicScores: Record<
		string,
		{ correct: number; total: number; percentage: number }
	>;
}

export interface UserProgress {
	userId: string;
	totalSessions: number;
	averageScore: number;
	topicMastery: Record<
		string,
		{
			totalQuestions: number;
			correctAnswers: number;
			percentage: number;
			lastAttempted: Date;
		}
	>;
	weakAreas: string[];
	strongAreas: string[];
	lastUpdated: Date;
	// New fields for enhanced tracking
	sessionHistory: QuizSessionResult[];
	streakData: {
		currentStreak: number;
		longestStreak: number;
		lastStudyDate: Date;
	};
}

// New interface for stored session results
export interface QuizSessionResult {
	id: string;
	mode: "study" | "exam";
	startTime: Date;
	endTime: Date;
	totalTime: number;
	score: number;
	totalQuestions: number;
	correctAnswers: number;
	topicScores: Record<
		string,
		{ correct: number; total: number; percentage: number }
	>;
	weakAreas: string[];
	strongAreas: string[];
	questions: Question[];
	answers: UserAnswer[];
	settings: QuizSettings;
}

// New interface for storage preferences
export interface StoragePreferences {
	useFileStorage: boolean;
	fileHandle?: FileSystemFileHandle;
	maxSessionHistory: number;
	autoBackup: boolean;
	lastBackupDate?: Date;
}

export interface QuizSettings {
	questionCount: number;
	timeLimit?: number; // calculated automatically based on questionCount (PSPO format: 80 questions = 60 minutes)
	includeExplanations: boolean;
	focusWeakAreas: boolean;
	topics: string[];
}

export interface AppState {
	currentSession: QuizSession | null;
	userProgress: UserProgress | null;
	settings: QuizSettings;
	storagePreferences: StoragePreferences;
	isPaused: boolean;
	remainingTime?: number;
}
