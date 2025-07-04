import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
	loadTopics,
	loadQuestions,
	generateQuiz,
	getTopicName,
} from "../utils/quizUtils";
import { Topic, Question, QuizSession } from "../types";
import {
	progressStorage,
	isFileSystemAccessSupported,
} from "../utils/storageUtils";
import "./Home.css";

const Home: React.FC = () => {
	const { state, dispatch } = useApp();
	const [topics, setTopics] = useState<Topic[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedMode, setSelectedMode] = useState<"study" | "exam">("study");
	const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
	const [questionCount, setQuestionCount] = useState(
		state.settings.questionCount
	);
	const [focusWeakAreas, setFocusWeakAreas] = useState(
		state.settings.focusWeakAreas
	);
	const [showStorageSettings, setShowStorageSettings] = useState(false);

	// Calculate time limit based on PSPO format (80 questions = 60 minutes)
	const calculateTimeLimit = (count: number): number => {
		return Math.round((count / 80) * 60);
	};

	const currentTimeLimit = calculateTimeLimit(questionCount);
	const secondsPerQuestion = Math.round(
		(currentTimeLimit * 60) / questionCount
	);

	useEffect(() => {
		const loadData = async () => {
			try {
				const [topicsData, questionsData] = await Promise.all([
					loadTopics(),
					loadQuestions(),
				]);
				setTopics(topicsData);
				setQuestions(questionsData);
				setSelectedTopics(topicsData.map((t) => t.id));
			} catch (error) {
				console.error("Failed to load data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	const handleStartQuiz = () => {
		if (questions.length === 0 || topics.length === 0) return;

		// Update settings
		dispatch({
			type: "UPDATE_SETTINGS",
			payload: {
				questionCount,
				timeLimit: currentTimeLimit,
				includeExplanations: selectedMode === "study",
				focusWeakAreas,
				topics: selectedTopics,
			},
		});

		// Generate quiz questions
		const quizQuestions = generateQuiz(
			questions,
			topics,
			{
				questionCount,
				timeLimit: currentTimeLimit,
				includeExplanations: selectedMode === "study",
				focusWeakAreas,
				topics: selectedTopics,
			},
			state.userProgress
		);

		// Create new session
		const newSession: QuizSession = {
			id: Date.now().toString(),
			mode: selectedMode,
			startTime: new Date(),
			questions: quizQuestions,
			answers: [],
			topicScores: {},
		};

		dispatch({ type: "START_SESSION", payload: newSession });
	};

	const handleTopicToggle = (topicId: string) => {
		setSelectedTopics((prev) =>
			prev.includes(topicId)
				? prev.filter((id) => id !== topicId)
				: [...prev, topicId]
		);
	};

	const handleRecommendedQuiz = () => {
		if (!state.userProgress || state.userProgress.weakAreas.length === 0) {
			return;
		}

		if (questions.length === 0 || topics.length === 0) return;

		// Configure recommended quiz settings
		const recommendedTopics = [...state.userProgress.weakAreas];
		const weakAreasCount = state.userProgress.weakAreas.length;
		const suggestedCount = Math.min(weakAreasCount * 5, 40);
		const recommendedTimeLimit = calculateTimeLimit(suggestedCount);

		// Update UI state for future reference
		setSelectedTopics(recommendedTopics);
		setFocusWeakAreas(true);
		setQuestionCount(suggestedCount);

		// Update settings in context
		dispatch({
			type: "UPDATE_SETTINGS",
			payload: {
				questionCount: suggestedCount,
				timeLimit: recommendedTimeLimit,
				includeExplanations: selectedMode === "study",
				focusWeakAreas: true,
				topics: recommendedTopics,
			},
		});

		// Generate quiz questions with recommended settings
		const quizQuestions = generateQuiz(
			questions,
			topics,
			{
				questionCount: suggestedCount,
				timeLimit: recommendedTimeLimit,
				includeExplanations: selectedMode === "study",
				focusWeakAreas: true,
				topics: recommendedTopics,
			},
			state.userProgress
		);

		// Create new session and start quiz
		const newSession: QuizSession = {
			id: Date.now().toString(),
			mode: selectedMode,
			startTime: new Date(),
			questions: quizQuestions,
			answers: [],
			topicScores: {},
		};

		dispatch({ type: "START_SESSION", payload: newSession });
	};

	const handleFileStorageSetup = async () => {
		try {
			const fileHandle = await progressStorage.selectFile();
			if (fileHandle) {
				dispatch({
					type: "UPDATE_STORAGE_PREFERENCES",
					payload: {
						useFileStorage: true,
						fileHandle: fileHandle,
					},
				});
			}
		} catch (error) {
			console.error("Failed to setup file storage:", error);
		}
	};

	const handleOpenFile = async () => {
		try {
			const fileHandle = await progressStorage.openFile();
			if (fileHandle) {
				dispatch({
					type: "UPDATE_STORAGE_PREFERENCES",
					payload: {
						useFileStorage: true,
						fileHandle: fileHandle,
					},
				});

				// Reload progress from the new file
				const progress = await progressStorage.loadProgress();
				if (progress) {
					dispatch({ type: "LOAD_PROGRESS", payload: progress });
				}
			}
		} catch (error) {
			console.error("Failed to open file:", error);
		}
	};

	const handleExportProgress = async () => {
		if (state.userProgress) {
			await progressStorage.exportProgress(state.userProgress);
		}
	};

	const handleResetProgress = () => {
		if (
			window.confirm(
				"Are you sure you want to reset all progress? This cannot be undone."
			)
		) {
			localStorage.removeItem("pspo-user-progress");
			// Dispatch a load with null to reset the progress
			dispatch({ type: "LOAD_PROGRESS", payload: null as any });
			window.location.reload(); // Reload to reinitialize the app
		}
	};

	const getRecentSessions = () => {
		if (!state.userProgress?.sessionHistory) return [];
		return state.userProgress.sessionHistory.slice(-5).reverse();
	};

	const getProgressTrend = () => {
		if (
			!state.userProgress?.sessionHistory ||
			state.userProgress.sessionHistory.length < 2
		) {
			return null;
		}

		const recent = state.userProgress.sessionHistory.slice(-10);
		const firstHalf = recent.slice(0, Math.ceil(recent.length / 2));
		const secondHalf = recent.slice(Math.ceil(recent.length / 2));

		const firstAvg =
			firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
		const secondAvg =
			secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

		return secondAvg - firstAvg;
	};

	if (loading) {
		return (
			<div className="home-container">
				<div className="loading">Loading PSPO 1 Study App...</div>
			</div>
		);
	}

	const recentSessions = getRecentSessions();
	const progressTrend = getProgressTrend();

	return (
		<div className="home-container">
			<div className="header">
				<h1>PSPO 1 Study App</h1>
				<p>Prepare for your Professional Scrum Product Owner I certification</p>
			</div>

			{state.userProgress && (
				<div className="dashboard">
					<div className="progress-overview">
						<h3>Your Progress Dashboard</h3>
						<div className="progress-stats">
							<div className="stat">
								<span className="stat-label">Total Sessions:</span>
								<span className="stat-value">
									{state.userProgress.totalSessions}
								</span>
							</div>
							<div className="stat">
								<span className="stat-label">Average Score:</span>
								<span className="stat-value">
									{state.userProgress.averageScore.toFixed(1)}%
								</span>
							</div>
							<div className="stat">
								<span className="stat-label">Study Streak:</span>
								<span className="stat-value">
									{state.userProgress.streakData.currentStreak} days
								</span>
							</div>
							<div className="stat">
								<span className="stat-label">Last Study:</span>
								<span className="stat-value">
									{new Date(
										state.userProgress.lastUpdated
									).toLocaleDateString()}
								</span>
							</div>
						</div>

						{progressTrend !== null && (
							<div className="progress-trend">
								<span className="trend-label">Recent Trend:</span>
								<span
									className={`trend-value ${
										progressTrend >= 0 ? "positive" : "negative"
									}`}
								>
									{progressTrend >= 0 ? "↗" : "↘"}{" "}
									{Math.abs(progressTrend).toFixed(1)}%
								</span>
							</div>
						)}
					</div>

					{state.userProgress && state.userProgress.weakAreas.length > 0 && (
						<div className="weak-areas-highlight">
							<h3>Continue Where You Left Off</h3>
							<p>Focus on these areas to improve your score:</p>
							<div className="weak-areas-list">
								{state.userProgress.weakAreas.map((topicId) => (
									<div key={topicId} className="weak-area-item">
										<span className="weak-area-name">
											{getTopicName(topicId, topics)}
										</span>
										<span className="weak-area-score">
											{state.userProgress?.topicMastery[
												topicId
											]?.percentage?.toFixed(1) ?? "N/A"}
											%
										</span>
									</div>
								))}
							</div>
							<button
								className="recommended-button"
								onClick={handleRecommendedQuiz}
							>
								Start Recommended Quiz
							</button>
						</div>
					)}

					{recentSessions.length > 0 && (
						<div className="recent-sessions">
							<h3>Recent Sessions</h3>
							<div className="sessions-list">
								{recentSessions.map((session) => (
									<div key={session.id} className="session-item">
										<div className="session-info">
											<span className="session-mode">{session.mode}</span>
											<span className="session-score">
												{session.score.toFixed(1)}%
											</span>
											<span className="session-date">
												{session.startTime.toLocaleDateString()}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="storage-info">
						<h3>Storage Settings</h3>
						<div className="storage-status">
							{state.storagePreferences.useFileStorage ? (
								<span className="storage-active">📁 File Storage Active</span>
							) : (
								<span className="storage-browser">🌐 Browser Storage</span>
							)}
							<button
								className="storage-toggle"
								onClick={() => setShowStorageSettings(!showStorageSettings)}
							>
								⚙️ Settings
							</button>
						</div>

						{showStorageSettings && (
							<div className="storage-controls">
								{isFileSystemAccessSupported() ? (
									<>
										<button onClick={handleFileStorageSetup}>
											📂 Select Storage File
										</button>
										<button onClick={handleOpenFile}>
											📁 Open Existing File
										</button>
									</>
								) : (
									<p>File storage requires a modern browser</p>
								)}
								<button
									onClick={handleExportProgress}
									disabled={!state.userProgress}
								>
									💾 Export Progress
								</button>
								<button
									onClick={handleResetProgress}
									disabled={!state.userProgress}
									style={{
										backgroundColor: "#dc3545",
										color: "white",
										marginTop: "10px",
									}}
								>
									🗑️ Reset All Progress
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			<div className="quiz-setup">
				<div className="mode-selection">
					<h3>Select Mode</h3>
					<div className="mode-buttons">
						<button
							className={`mode-button ${
								selectedMode === "study" ? "active" : ""
							}`}
							onClick={() => setSelectedMode("study")}
						>
							<h4>Study Mode</h4>
							<p>Learn with immediate feedback and explanations</p>
						</button>
						<button
							className={`mode-button ${
								selectedMode === "exam" ? "active" : ""
							}`}
							onClick={() => setSelectedMode("exam")}
						>
							<h4>Exam Mode</h4>
							<p>Timed test without explanations</p>
						</button>
					</div>
				</div>

				<div className="settings">
					<h3>Quiz Settings</h3>

					<div className="setting-group">
						<label htmlFor="questionCount">Number of Questions:</label>
						<select
							id="questionCount"
							value={questionCount}
							onChange={(e) => setQuestionCount(Number(e.target.value))}
						>
							<option value={10}>10 questions</option>
							<option value={20}>20 questions</option>
							<option value={40}>40 questions</option>
							<option value={60}>60 questions</option>
							<option value={80}>80 questions (full exam)</option>
						</select>
					</div>

					{selectedMode === "exam" && (
						<div className="setting-group">
							<label>Time Limit:</label>
							<div className="time-display">
								<span className="time-limit">{currentTimeLimit} minutes</span>
								<span className="time-per-question">
									({secondsPerQuestion} seconds per question)
								</span>
							</div>
						</div>
					)}

					{state.userProgress && (
						<div className="setting-group">
							<label className="checkbox-label">
								<input
									type="checkbox"
									checked={focusWeakAreas}
									onChange={(e) => setFocusWeakAreas(e.target.checked)}
								/>
								Focus on weak areas
							</label>
						</div>
					)}

					<div className="setting-group">
						<label>Topics to Include:</label>
						<div className="topics-grid">
							{topics.map((topic) => (
								<label key={topic.id} className="topic-checkbox">
									<input
										type="checkbox"
										checked={selectedTopics.includes(topic.id)}
										onChange={() => handleTopicToggle(topic.id)}
									/>
									<span className="topic-name">{topic.name}</span>
									<span className="topic-weight">({topic.weight}%)</span>
									{state.userProgress?.topicMastery[topic.id] && (
										<span
											className={`topic-mastery ${
												state.userProgress.topicMastery[topic.id].percentage <
												60
													? "weak"
													: state.userProgress.topicMastery[topic.id]
															.percentage >= 80
													? "strong"
													: "average"
											}`}
										>
											{state.userProgress.topicMastery[
												topic.id
											].percentage?.toFixed(1) ?? "N/A"}
											%
										</span>
									)}
								</label>
							))}
						</div>
					</div>
				</div>

				<button
					className="start-button"
					onClick={handleStartQuiz}
					disabled={selectedTopics.length === 0}
				>
					Start {selectedMode === "study" ? "Study" : "Exam"}
				</button>
			</div>
		</div>
	);
};

export default Home;
