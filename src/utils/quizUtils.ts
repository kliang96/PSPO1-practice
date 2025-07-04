import {
	Question,
	Topic,
	UserProgress,
	QuizSettings,
	UserAnswer,
} from "../types";

// Load questions from JSON file - Updated to use new topic-based structure
export const loadQuestions = async (): Promise<Question[]> => {
	try {
		// Load from new topic-based structure
		const response = await fetch("/data/questions-index.json");
		const index = await response.json();

		const allQuestions: Question[] = [];

		// Load questions from each topic file
		for (const topic of index.topics) {
			const topicResponse = await fetch(`/data/${topic.questionFile}`);
			const topicData = await topicResponse.json();
			allQuestions.push(...topicData.questions);
		}

		return allQuestions;
	} catch (error) {
		console.error("Failed to load questions:", error);
		return [];
	}
};

// Load topics from JSON file - Updated to use new index structure
export const loadTopics = async (): Promise<Topic[]> => {
	try {
		// Load from new index structure
		const response = await fetch("/data/questions-index.json");
		const index = await response.json();

		// Convert index topics to Topic format
		const topics: Topic[] = index.topics.map((topic: any) => ({
			id: topic.id,
			name: topic.name,
			description: topic.description,
			weight: topic.weight,
		}));

		return topics;
	} catch (error) {
		console.error("Failed to load topics from index:", error);
		return [];
	}
};

// Normalize question text for similarity comparison
const normalizeQuestionText = (text: string): string => {
	return text.trim().toLowerCase().replace(/\s+/g, " ");
};

// Check if two questions are similar by comparing normalized text
const areQuestionsSimilar = (
	q1: Question,
	q2: Question,
	threshold: number = 0.85
): boolean => {
	const text1 = normalizeQuestionText(q1.question);
	const text2 = normalizeQuestionText(q2.question);

	// If texts are identical, they're duplicates
	if (text1 === text2) {
		return true;
	}

	// Calculate similarity using simple character-based comparison
	const minLength = Math.min(text1.length, text2.length);
	const maxLength = Math.max(text1.length, text2.length);

	// If length difference is too large, they're not similar
	if (minLength / maxLength < 0.7) {
		return false;
	}

	// Count matching characters at same positions
	let matches = 0;
	const compareLength = Math.min(text1.length, text2.length);

	for (let i = 0; i < compareLength; i++) {
		if (text1[i] === text2[i]) {
			matches++;
		}
	}

	const similarity = matches / maxLength;
	return similarity >= threshold;
};

// Generate quiz questions based on settings and user progress
export const generateQuiz = (
	questions: Question[],
	topics: Topic[],
	settings: QuizSettings,
	userProgress: UserProgress | null
): Question[] => {
	let availableQuestions = [...questions];

	// Filter by selected topics if specified
	if (settings.topics.length > 0) {
		availableQuestions = availableQuestions.filter((q) =>
			settings.topics.includes(q.topic)
		);
	}

	// DUPLICATE PREVENTION: Remove potential duplicates by similarity
	const deduplicatedQuestions: Question[] = [];
	const usedQuestionTexts = new Set<string>();

	for (const question of availableQuestions) {
		const normalizedText = normalizeQuestionText(question.question);

		// Check if this question is too similar to any already selected
		let isDuplicate = false;

		// First check exact text match
		if (usedQuestionTexts.has(normalizedText)) {
			isDuplicate = true;
		} else {
			// Check similarity with already selected questions
			for (const selectedQuestion of deduplicatedQuestions) {
				if (areQuestionsSimilar(question, selectedQuestion)) {
					isDuplicate = true;
					console.warn(
						`Duplicate detected: "${question.question.slice(0, 50)}..." (ID: ${
							question.id
						}) similar to "${selectedQuestion.question.slice(0, 50)}..." (ID: ${
							selectedQuestion.id
						})`
					);
					break;
				}
			}
		}

		if (!isDuplicate) {
			deduplicatedQuestions.push(question);
			usedQuestionTexts.add(normalizedText);
		}
	}

	// Update available questions to deduplicated list
	availableQuestions = deduplicatedQuestions;

	console.log(
		`Deduplication: ${questions.length} -> ${
			deduplicatedQuestions.length
		} questions (${
			questions.length - deduplicatedQuestions.length
		} duplicates removed)`
	);

	// If focusing on weak areas and we have progress data
	if (settings.focusWeakAreas && userProgress) {
		const weakTopics = userProgress.weakAreas;
		const strongTopics = userProgress.strongAreas;

		// Weight questions from weak areas more heavily
		const weightedQuestions = availableQuestions.map((q) => {
			let weight = 1;
			if (weakTopics.includes(q.topic)) {
				weight = 3; // Higher weight for weak areas
			} else if (strongTopics.includes(q.topic)) {
				weight = 0.5; // Lower weight for strong areas
			}
			return { question: q, weight };
		});

		// Sort by weight and select questions
		weightedQuestions.sort((a, b) => b.weight - a.weight);
		availableQuestions = weightedQuestions.map((wq) => wq.question);
	}

	// Ensure we have enough questions
	if (availableQuestions.length < settings.questionCount) {
		console.warn(
			`Not enough questions available. Requested: ${settings.questionCount}, Available: ${availableQuestions.length}`
		);
		return availableQuestions;
	}

	// Randomly select questions with final duplicate check
	const selectedQuestions: Question[] = [];
	const usedIndices = new Set<number>();
	const finalUsedTexts = new Set<string>();

	while (
		selectedQuestions.length < settings.questionCount &&
		usedIndices.size < availableQuestions.length
	) {
		const randomIndex = Math.floor(Math.random() * availableQuestions.length);

		if (!usedIndices.has(randomIndex)) {
			const candidateQuestion = availableQuestions[randomIndex];
			const normalizedText = normalizeQuestionText(candidateQuestion.question);

			// Final duplicate check - ensure we don't select similar questions
			let isAcceptable = !finalUsedTexts.has(normalizedText);

			if (isAcceptable) {
				// Check for similarity with already selected questions
				for (const selectedQuestion of selectedQuestions) {
					if (areQuestionsSimilar(candidateQuestion, selectedQuestion)) {
						isAcceptable = false;
						break;
					}
				}
			}

			usedIndices.add(randomIndex);

			if (isAcceptable) {
				selectedQuestions.push(candidateQuestion);
				finalUsedTexts.add(normalizedText);
			}
		}
	}

	return selectedQuestions;
};

// Calculate session results and update progress
export const calculateSessionResults = (
	questions: Question[],
	answers: UserAnswer[],
	topics: Topic[]
): {
	score: number;
	topicScores: Record<
		string,
		{ correct: number; total: number; percentage: number }
	>;
	weakAreas: string[];
	strongAreas: string[];
} => {
	const topicScores: Record<
		string,
		{ correct: number; total: number; percentage: number }
	> = {};

	// Initialize topic scores
	topics.forEach((topic) => {
		topicScores[topic.id] = { correct: 0, total: 0, percentage: 0 };
	});

	// Calculate scores by topic
	questions.forEach((question) => {
		const answer = answers.find((a) => a.questionId === question.id);
		if (answer) {
			const topicScore = topicScores[question.topic];
			topicScore.total++;
			if (answer.isCorrect) {
				topicScore.correct++;
			}
		}
	});

	// Calculate percentages
	Object.keys(topicScores).forEach((topicId) => {
		const score = topicScores[topicId];
		score.percentage =
			score.total > 0 ? (score.correct / score.total) * 100 : 0;
	});

	// Calculate overall score
	const totalCorrect = answers.filter((a) => a.isCorrect).length;
	const score = (totalCorrect / questions.length) * 100;

	// Identify weak and strong areas
	const weakAreas: string[] = [];
	const strongAreas: string[] = [];

	Object.entries(topicScores).forEach(([topicId, score]) => {
		if (score.total >= 2) {
			// Only consider topics with at least 2 questions
			if (score.percentage < 60) {
				weakAreas.push(topicId);
			} else if (score.percentage >= 80) {
				strongAreas.push(topicId);
			}
		}
	});

	return {
		score,
		topicScores,
		weakAreas,
		strongAreas,
	};
};

// Update user progress with new session results
export const updateUserProgress = (
	currentProgress: UserProgress | null,
	sessionResults: {
		score: number;
		topicScores: Record<
			string,
			{ correct: number; total: number; percentage: number }
		>;
		weakAreas: string[];
		strongAreas: string[];
	},
	topics: Topic[]
): UserProgress => {
	const now = new Date();

	if (!currentProgress) {
		// Initialize new progress
		const topicMastery: Record<
			string,
			{
				totalQuestions: number;
				correctAnswers: number;
				percentage: number;
				lastAttempted: Date;
			}
		> = {};

		topics.forEach((topic) => {
			topicMastery[topic.id] = {
				totalQuestions: 0,
				correctAnswers: 0,
				percentage: 0,
				lastAttempted: now,
			};
		});

		return {
			userId: "default-user",
			totalSessions: 1, // Will be updated to match sessionHistory.length in reducer
			averageScore: sessionResults.score,
			topicMastery,
			weakAreas: sessionResults.weakAreas,
			strongAreas: sessionResults.strongAreas,
			lastUpdated: now,
			sessionHistory: [], // Will be populated by reducer
			streakData: {
				currentStreak: 1,
				longestStreak: 1,
				lastStudyDate: now,
			},
		};
	}

	// Update existing progress
	const updatedTopicMastery = { ...currentProgress.topicMastery };

	Object.entries(sessionResults.topicScores).forEach(([topicId, score]) => {
		const existing = updatedTopicMastery[topicId] || {
			totalQuestions: 0,
			correctAnswers: 0,
			percentage: 0,
			lastAttempted: now,
		};

		updatedTopicMastery[topicId] = {
			totalQuestions: existing.totalQuestions + score.total,
			correctAnswers: existing.correctAnswers + score.correct,
			percentage:
				((existing.correctAnswers + score.correct) /
					(existing.totalQuestions + score.total)) *
				100,
			lastAttempted: now,
		};
	});

	// Don't increment totalSessions here - it will be computed from sessionHistory.length
	// in the reducer after the session is added
	const averageScore =
		(currentProgress.averageScore * currentProgress.totalSessions +
			sessionResults.score) /
		(currentProgress.totalSessions + 1);

	return {
		...currentProgress,
		averageScore,
		topicMastery: updatedTopicMastery,
		weakAreas: sessionResults.weakAreas,
		strongAreas: sessionResults.strongAreas,
		lastUpdated: now,
		// sessionHistory will be handled by the reducer
		// streakData will be handled by the reducer
		// totalSessions will be computed from sessionHistory.length in the reducer
	};
};

// Format time in MM:SS format
export const formatTime = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
		.toString()
		.padStart(2, "0")}`;
};

// Get topic name by ID
export const getTopicName = (topicId: string, topics: Topic[]): string => {
	const topic = topics.find((t) => t.id === topicId);
	return topic ? topic.name : topicId;
};

// Calculate time spent on a question
export const calculateTimeSpent = (startTime: Date, endTime: Date): number => {
	return Math.round((endTime.getTime() - startTime.getTime()) / 1000);
};
