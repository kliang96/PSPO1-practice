import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { generateSessionId } from "../utils/sessionUtils";
import "./Home.css";

const Home: React.FC = () => {
	const { state, dispatch } = useApp();
	const navigate = useNavigate();
	const [topics, setTopics] = useState<Topic[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [generatingQuiz, setGeneratingQuiz] = useState(false);
	const [selectedMode, setSelectedMode] = useState<"study" | "exam">("study");
	const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
	const [questionCount, setQuestionCount] = useState(
		state.settings.questionCount
	);
	const [focusWeakAreas, setFocusWeakAreas] = useState(
		state.settings.focusWeakAreas
	);
	const [showStorageSettings, setShowStorageSettings] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	// Calculate time limit based on PSPO format (80 questions = 60 minutes)
	const calculateTimeLimit = (count: number): number => {
		return Math.round((count / 80) * 60);
	};

	const currentTimeLimit = calculateTimeLimit(questionCount);
	const secondsPerQuestion = Math.round(
		(currentTimeLimit * 60) / questionCount
	);

	// Validation function to check if selected topics have enough questions
	const validateTopicQuestions = useCallback((): {
		isValid: boolean;
		availableQuestions: number;
		errorMessage: string | null;
	} => {
		if (selectedTopics.length === 0) {
			return {
				isValid: false,
				availableQuestions: 0,
				errorMessage: "Please select at least one topic to study.",
			};
		}

		// Calculate total available questions from selected topics
		const availableQuestions = selectedTopics.reduce((total, topicId) => {
			const topic = topics.find((t) => t.id === topicId);
			// Note: We need to access questionCount from the topic data
			// This will be available once we load the topics with question counts
			return total + (topic?.questionCount || 0);
		}, 0);

		if (availableQuestions < questionCount) {
			const shortfall = questionCount - availableQuestions;
			const selectedTopicNames = selectedTopics
				.map((topicId) => {
					const topic = topics.find((t) => t.id === topicId);
					return topic?.name || topicId;
				})
				.join(", ");

			return {
				isValid: false,
				availableQuestions,
				errorMessage: `insufficient-questions|${availableQuestions}|${questionCount}|${shortfall}|${selectedTopicNames}`,
			};
		}

		return {
			isValid: true,
			availableQuestions,
			errorMessage: null,
		};
	}, [selectedTopics, questionCount, topics]);

	// Effect to validate whenever topics or question count changes
	useEffect(() => {
		const validation = validateTopicQuestions();
		setValidationError(validation.errorMessage);
	}, [validateTopicQuestions]);

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

	const handleStartQuiz = async () => {
		if (questions.length === 0 || topics.length === 0) return;

		setGeneratingQuiz(true);

		try {
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

			// Generate quiz questions (this may take time due to duplicate prevention)
			const quizQuestions = await new Promise<Question[]>((resolve) => {
				// Use setTimeout to allow UI to update before heavy processing
				setTimeout(() => {
					const result = generateQuiz(
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
					resolve(result);
				}, 100);
			});

			// Create new session
			const sessionId = generateSessionId();
			const newSession: QuizSession = {
				id: sessionId,
				mode: selectedMode,
				startTime: new Date(),
				questions: quizQuestions,
				answers: [],
				topicScores: {},
			};

			dispatch({ type: "START_SESSION", payload: newSession });
			navigate(`/quiz/${sessionId}`);
		} catch (error) {
			console.error("Error generating quiz:", error);
		} finally {
			setGeneratingQuiz(false);
		}
	};

	const handleTopicToggle = (topicId: string) => {
		setSelectedTopics((prev) =>
			prev.includes(topicId)
				? prev.filter((id) => id !== topicId)
				: [...prev, topicId]
		);
	};

	const handleRecommendedQuiz = async () => {
		if (!state.userProgress || state.userProgress.weakAreas.length === 0) {
			return;
		}

		if (questions.length === 0 || topics.length === 0) return;

		setGeneratingQuiz(true);

		try {
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
			const quizQuestions = await new Promise<Question[]>((resolve) => {
				// Use setTimeout to allow UI to update before heavy processing
				setTimeout(() => {
					const result = generateQuiz(
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
					resolve(result);
				}, 100);
			});

			// Create new session and start quiz
			const sessionId = generateSessionId();
			const newSession: QuizSession = {
				id: sessionId,
				mode: selectedMode,
				startTime: new Date(),
				questions: quizQuestions,
				answers: [],
				topicScores: {},
			};

			dispatch({ type: "START_SESSION", payload: newSession });
			navigate(`/quiz/${sessionId}`);
		} catch (error) {
			console.error("Error generating recommended quiz:", error);
		} finally {
			setGeneratingQuiz(false);
		}
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

	if (generatingQuiz) {
		return (
			<div className="quiz-generation-overlay">
				<div className="quiz-generation-content">
					<div className="loading-spinner"></div>
					<h2>Generating Your Quiz</h2>
					<p>
						We're carefully selecting {questionCount} unique questions and
						running them through our advanced duplicate prevention algorithms to
						ensure you get the best study experience.
					</p>
					<div className="loading-steps">
						<div className="loading-step">
							<div className="step-icon">🔍</div>
							<span>Filtering questions by topics</span>
						</div>
						<div className="loading-step">
							<div className="step-icon">🚫</div>
							<span>Removing duplicate questions</span>
						</div>
						<div className="loading-step">
							<div className="step-icon">🔀</div>
							<span>Randomizing question order</span>
						</div>
						<div className="loading-step">
							<div className="step-icon">✅</div>
							<span>Finalizing your quiz</span>
						</div>
					</div>
					<div className="loading-tip">
						<strong>Pro tip:</strong> This process ensures no duplicate
						questions appear in your {selectedMode} session!
					</div>
				</div>
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
								disabled={generatingQuiz}
							>
								{generatingQuiz
									? "Generating Quiz..."
									: "Start Recommended Quiz"}
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
									<span className="topic-info">
										<span className="topic-weight">({topic.weight}%)</span>
										<span className="topic-question-count">
											{topic.questionCount} questions
										</span>
									</span>
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

				{/* Show validation error message */}
				{validationError && (
					<div className="validation-error">
						{validationError.startsWith("insufficient-questions|") ? (
							(() => {
								const parts = validationError.split("|");
								const availableQuestions = parts[1];
								const requestedQuestions = parts[2];
								const shortfall = parts[3];
								const selectedTopics = parts[4];

								return (
									<div className="validation-error-content">
										<div className="validation-error-header">
											<span className="validation-error-icon">⚠️</span>
											<h4>Not enough questions available!</h4>
										</div>

										<div className="validation-error-stats">
											<div className="error-stat">
												<span className="error-stat-label">
													Selected topics:
												</span>
												<span className="error-stat-value">
													{selectedTopics}
												</span>
											</div>
											<div className="error-stat">
												<span className="error-stat-label">
													Available questions:
												</span>
												<span className="error-stat-value error-stat-available">
													{availableQuestions}
												</span>
											</div>
											<div className="error-stat">
												<span className="error-stat-label">
													Requested questions:
												</span>
												<span className="error-stat-value error-stat-requested">
													{requestedQuestions}
												</span>
											</div>
											<div className="error-stat">
												<span className="error-stat-label">Shortfall:</span>
												<span className="error-stat-value error-stat-shortfall">
													{shortfall} questions
												</span>
											</div>
										</div>

										<div className="validation-error-actions">
											<div className="error-action-header">
												<span className="error-action-icon">🔧</span>
												<strong>To fix this, you can:</strong>
											</div>
											<ul className="error-action-list">
												<li>Select more topics to get additional questions</li>
												<li>
													Reduce question count to{" "}
													<strong>{availableQuestions}</strong> or fewer
												</li>
											</ul>
										</div>
									</div>
								);
							})()
						) : (
							<p>{validationError}</p>
						)}
					</div>
				)}

				<button
					className="start-button"
					onClick={handleStartQuiz}
					disabled={!!validationError || generatingQuiz}
				>
					{generatingQuiz
						? "Generating Quiz..."
						: `Start ${selectedMode === "study" ? "Study" : "Exam"}`}
				</button>
			</div>
		</div>
	);
};

export default Home;
