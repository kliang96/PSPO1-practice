import { Question } from "../types";

// Load the questions index to get topic metadata
export const loadQuestionsIndex = async () => {
	const response = await fetch("/data/questions-index.json");
	return await response.json();
};

// Load questions from a specific topic
export const loadTopicQuestions = async (topicId: string) => {
	const index = await loadQuestionsIndex();
	const topic = index.topics.find((t: any) => t.id === topicId);

	if (!topic) {
		throw new Error(`Topic ${topicId} not found`);
	}

	const response = await fetch(`/data/${topic.questionFile}`);
	const topicData = await response.json();

	return {
		topic: topicData.topic,
		metadata: topicData.metadata,
		questions: topicData.questions as Question[],
	};
};

// Load all questions from all topics
export const loadAllQuestions = async (): Promise<Question[]> => {
	const index = await loadQuestionsIndex();
	const allQuestions: Question[] = [];

	for (const topic of index.topics) {
		const response = await fetch(`/data/${topic.questionFile}`);
		const topicData = await response.json();
		allQuestions.push(...topicData.questions);
	}

	return allQuestions;
};

// Load questions by difficulty from a specific topic
export const loadQuestionsByDifficulty = async (
	topicId: string,
	difficulty: "easy" | "medium" | "hard"
) => {
	const topicData = await loadTopicQuestions(topicId);
	return topicData.questions.filter(
		(q: Question) => q.difficulty === difficulty
	);
};

// Load a random sample of questions from specific topics
export const loadRandomQuestions = async (
	topicIds: string[],
	count: number
) => {
	const allQuestions: Question[] = [];

	for (const topicId of topicIds) {
		const topicData = await loadTopicQuestions(topicId);
		allQuestions.push(...topicData.questions);
	}

	// Shuffle and take random sample
	const shuffled = allQuestions.sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
};

// Load questions for a practice quiz with balanced distribution
export const loadPracticeQuiz = async (
	topicIds: string[],
	questionsPerTopic: number = 5
) => {
	const quizQuestions: Question[] = [];

	for (const topicId of topicIds) {
		const topicData = await loadTopicQuestions(topicId);

		// Get balanced distribution (2 easy, 2 medium, 1 hard)
		const easyQuestions = topicData.questions.filter(
			(q: Question) => q.difficulty === "easy"
		);
		const mediumQuestions = topicData.questions.filter(
			(q: Question) => q.difficulty === "medium"
		);
		const hardQuestions = topicData.questions.filter(
			(q: Question) => q.difficulty === "hard"
		);

		// Shuffle each difficulty level
		const shuffledEasy = easyQuestions.sort(() => 0.5 - Math.random());
		const shuffledMedium = mediumQuestions.sort(() => 0.5 - Math.random());
		const shuffledHard = hardQuestions.sort(() => 0.5 - Math.random());

		// Take balanced sample
		const topicQuestions = [
			...shuffledEasy.slice(0, 2),
			...shuffledMedium.slice(0, 2),
			...shuffledHard.slice(0, 1),
		];

		quizQuestions.push(...topicQuestions);
	}

	// Shuffle final quiz questions
	return quizQuestions.sort(() => 0.5 - Math.random());
};

// Get available topics
export const getAvailableTopics = async () => {
	const index = await loadQuestionsIndex();
	return index.topics.map((topic: any) => ({
		id: topic.id,
		name: topic.name,
		description: topic.description,
		weight: topic.weight,
		questionCount: topic.questionCount,
	}));
};

// Get topic statistics
export const getTopicStats = async (topicId: string) => {
	const topicData = await loadTopicQuestions(topicId);
	return {
		totalQuestions: topicData.metadata.totalQuestions,
		difficulty: topicData.metadata.difficulty,
		topic: topicData.topic,
	};
};
