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
			questionCount: topic.questionCount, // Include question count for validation
			subtopics: [], // Empty for now as this structure isn't used
		}));

		return topics;
	} catch (error) {
		console.error("Failed to load topics from index:", error);
		return [];
	}
};

// Normalize question text for similarity comparison
const normalizeQuestionText = (text: string): string => {
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/[^\w\s]/g, ""); // Remove punctuation for better comparison
};

// Improved similarity detection using multiple methods
const areQuestionsSimilar = (
	q1: Question,
	q2: Question,
	threshold: number = 0.8
): boolean => {
	// First check: exact ID match (should never happen but safety check)
	if (q1.id === q2.id) {
		return true;
	}

	const text1 = normalizeQuestionText(q1.question);
	const text2 = normalizeQuestionText(q2.question);

	// Second check: exact text match after normalization
	if (text1 === text2) {
		return true;
	}

	// Third check: significant text overlap (improved algorithm)
	const words1 = text1.split(" ").filter((word) => word.length > 3); // Ignore small words
	const words2 = text2.split(" ").filter((word) => word.length > 3);

	if (words1.length === 0 || words2.length === 0) {
		return false;
	}

	// Calculate word-based similarity
	const commonWords = words1.filter((word) => words2.includes(word));
	const wordSimilarity =
		commonWords.length / Math.max(words1.length, words2.length);

	if (wordSimilarity > 0.6) {
		return true;
	}

	// Fourth check: character-based similarity (more accurate than original)
	const minLength = Math.min(text1.length, text2.length);
	const maxLength = Math.max(text1.length, text2.length);

	// If length difference is too large, they're not similar
	if (minLength / maxLength < 0.6) {
		return false;
	}

	// Use Levenshtein distance for more accurate similarity
	const distance = calculateLevenshteinDistance(text1, text2);
	const similarity = 1 - distance / maxLength;

	return similarity >= threshold;
};

// Helper function to calculate Levenshtein distance
const calculateLevenshteinDistance = (str1: string, str2: string): number => {
	const matrix = [];
	const len1 = str1.length;
	const len2 = str2.length;

	for (let i = 0; i <= len2; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= len1; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= len2; i++) {
		for (let j = 1; j <= len1; j++) {
			if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}

	return matrix[len2][len1];
};

// Proper Fisher-Yates shuffle implementation
const shuffleArray = <T>(array: T[]): T[] => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
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

	console.log(
		`Starting with ${availableQuestions.length} questions after topic filtering`
	);

	// IMPROVED DUPLICATE PREVENTION: Use question IDs as primary tracking
	const deduplicatedQuestions: Question[] = [];
	const usedQuestionIds = new Set<number>();
	const usedQuestionTexts = new Set<string>();

	for (const question of availableQuestions) {
		// Primary check: Question ID (should be unique)
		if (usedQuestionIds.has(question.id)) {
			console.warn(
				`Duplicate ID detected: ${question.id} - "${question.question.slice(
					0,
					50
				)}..."`
			);
			continue;
		}

		// Secondary check: Normalized text
		const normalizedText = normalizeQuestionText(question.question);
		if (usedQuestionTexts.has(normalizedText)) {
			console.warn(
				`Duplicate text detected: ID ${
					question.id
				} - "${question.question.slice(0, 50)}..."`
			);
			continue;
		}

		// Tertiary check: Similarity with already selected questions
		let isDuplicate = false;
		for (const selectedQuestion of deduplicatedQuestions) {
			if (areQuestionsSimilar(question, selectedQuestion)) {
				isDuplicate = true;
				console.warn(
					`Similar question detected: ID ${
						question.id
					} "${question.question.slice(0, 50)}..." similar to ID ${
						selectedQuestion.id
					} "${selectedQuestion.question.slice(0, 50)}..."`
				);
				break;
			}
		}

		if (!isDuplicate) {
			deduplicatedQuestions.push(question);
			usedQuestionIds.add(question.id);
			usedQuestionTexts.add(normalizedText);
		}
	}

	// Update available questions to deduplicated list
	availableQuestions = deduplicatedQuestions;

	console.log(
		`After deduplication: ${availableQuestions.length} questions (${
			questions.length - availableQuestions.length
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

	// IMPROVED SELECTION: Use proper Fisher-Yates shuffle and deterministic selection
	const shuffledQuestions = shuffleArray(availableQuestions);
	const selectedQuestions: Question[] = [];
	const finalUsedIds = new Set<number>();

	// Select questions ensuring absolute uniqueness
	for (const question of shuffledQuestions) {
		if (selectedQuestions.length >= settings.questionCount) {
			break;
		}

		// Double-check for ID uniqueness (should never be needed but safety first)
		if (!finalUsedIds.has(question.id)) {
			selectedQuestions.push(question);
			finalUsedIds.add(question.id);
		}
	}

	console.log(
		`Quiz generated: ${selectedQuestions.length} unique questions selected`
	);

	// Final verification: Check for any duplicates in the selected questions
	const finalIds = selectedQuestions.map((q) => q.id);
	const uniqueIds = new Set(finalIds);

	if (finalIds.length !== uniqueIds.size) {
		console.error("CRITICAL: Duplicate questions detected in final selection!");
		// Remove duplicates as final safety measure
		const uniqueQuestions = selectedQuestions.filter((question, index) => {
			return finalIds.indexOf(question.id) === index;
		});
		return uniqueQuestions;
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
