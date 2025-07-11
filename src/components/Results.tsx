import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
	calculateSessionResults,
	updateUserProgress,
	formatTime,
	getTopicName,
} from "../utils/quizUtils";
import { loadTopics } from "../utils/quizUtils";
import { Topic, Question, UserAnswer } from "../types";
import { loadSessionFromStorage } from "../utils/sessionUtils";
import "./Results.css";

const Results: React.FC = () => {
	const { state, dispatch } = useApp();
	const { sessionId } = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const [topics, setTopics] = useState<Topic[]>([]);
	const [results, setResults] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [sessionProcessed, setSessionProcessed] = useState(false);
	const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
	const [isWrongAnswersExpanded, setIsWrongAnswersExpanded] = useState(false);

	const session = state.currentSession;

	// Function to toggle topic expansion
	const toggleTopic = (topicId: string) => {
		const newExpanded = new Set(expandedTopics);
		if (newExpanded.has(topicId)) {
			newExpanded.delete(topicId);
		} else {
			newExpanded.add(topicId);
		}
		setExpandedTopics(newExpanded);
	};

	// Function to toggle wrong answers expansion
	const toggleWrongAnswers = () => {
		setIsWrongAnswersExpanded(!isWrongAnswersExpanded);
	};

	// Function to group questions by topic
	const groupQuestionsByTopic = (
		questions: Question[],
		answers: UserAnswer[]
	) => {
		const grouped: Record<
			string,
			{ questions: Question[]; answers: UserAnswer[] }
		> = {};

		questions.forEach((question) => {
			const topicId = question.topic;
			if (!grouped[topicId]) {
				grouped[topicId] = { questions: [], answers: [] };
			}
			grouped[topicId].questions.push(question);

			// Find the corresponding answer
			const answer = answers.find((a) => a.questionId === question.id);
			if (answer) {
				grouped[topicId].answers.push(answer);
			}
		});

		return grouped;
	};

	// Function to get wrong answers
	const getWrongAnswers = () => {
		const wrongAnswers: Array<{
			question: Question;
			answer: UserAnswer;
			questionNumber: number;
		}> = [];

		if (!session) return wrongAnswers;

		session.questions.forEach((question, index) => {
			const answer = session.answers.find((a) => a.questionId === question.id);
			if (answer && !answer.isCorrect) {
				wrongAnswers.push({
					question,
					answer,
					questionNumber: index + 1,
				});
			}
		});

		return wrongAnswers;
	};

	// Session validation and loading
	useEffect(() => {
		const validateAndLoadSession = async () => {
			if (!sessionId) {
				navigate("/", { replace: true });
				return;
			}

			// If no current session or session ID mismatch, try to load from storage
			if (!state.currentSession || state.currentSession.id !== sessionId) {
				const savedSession = loadSessionFromStorage(sessionId);
				if (savedSession) {
					dispatch({ type: "RESTORE_SESSION", payload: savedSession });
				} else {
					// Session not found, redirect to home
					navigate("/", { replace: true });
					return;
				}
			}

			// Check if session has ended (required for results page)
			if (state.currentSession && !state.currentSession.endTime) {
				// Session hasn't ended yet, redirect to quiz
				navigate(`/quiz/${sessionId}`, { replace: true });
				return;
			}
		};

		validateAndLoadSession();
	}, [sessionId, state.currentSession, dispatch, navigate]);

	// Reset sessionProcessed when a new session starts
	useEffect(() => {
		setSessionProcessed(false);
	}, [session?.id]);

	// Load topics once
	useEffect(() => {
		const loadTopicsData = async () => {
			try {
				const topicsData = await loadTopics();
				setTopics(topicsData);
			} catch (error) {
				console.error("Failed to load topics:", error);
			}
		};

		loadTopicsData();
	}, []);

	// Process session results once when session and topics are available
	useEffect(() => {
		if (!session || !topics.length || sessionProcessed) {
			setIsLoading(false);
			return;
		}

		const processSession = async () => {
			try {
				const sessionResults = calculateSessionResults(
					session.questions,
					session.answers,
					topics
				);

				setResults(sessionResults);

				// Update user progress
				const updatedProgress = updateUserProgress(
					state.userProgress,
					sessionResults,
					topics
				);

				dispatch({ type: "UPDATE_PROGRESS", payload: updatedProgress });

				// Save session result to history
				const sessionResult = {
					id: session.id,
					mode: session.mode,
					startTime: session.startTime,
					endTime: session.endTime || new Date(),
					totalTime: session.totalTime || 0,
					score: sessionResults.score,
					totalQuestions: session.questions.length,
					correctAnswers: session.answers.filter((a) => a.isCorrect).length,
					topicScores: sessionResults.topicScores,
					weakAreas: sessionResults.weakAreas,
					strongAreas: sessionResults.strongAreas,
					questions: session.questions,
					answers: session.answers,
					settings: state.settings,
				};

				dispatch({ type: "SAVE_SESSION_RESULT", payload: sessionResult });
				setSessionProcessed(true);
			} catch (error) {
				console.error("Failed to process session:", error);
			} finally {
				setIsLoading(false);
			}
		};

		processSession();
	}, [
		session,
		topics,
		sessionProcessed,
		state.userProgress,
		state.settings,
		dispatch,
	]);

	const backToHome = () => {
		dispatch({ type: "CLEAR_SESSION" });
		navigate("/");
	};

	const handleReviewAnswers = () => {
		// This could open a detailed review modal or navigate to a review page
		console.log("Review answers functionality");
	};

	if (!session || isLoading) {
		return <div className="results-loading">Loading results...</div>;
	}

	if (!results) {
		return <div className="results-error">Error loading results</div>;
	}

	const totalQuestions = session.questions.length;
	const correctAnswers = session.answers.filter((a) => a.isCorrect).length;
	const score = (correctAnswers / totalQuestions) * 100;
	const totalTime = session.totalTime || 0;

	return (
		<div className="results-container">
			<div className="results-header">
				<h1>Quiz Results</h1>
				<div className="mode-badge">
					{session.mode === "study" ? "Study Mode" : "Exam Mode"}
				</div>
			</div>

			<div className="results-summary">
				<div className="score-card">
					<div className="score-circle">
						<span className="score-percentage">{score.toFixed(1)}%</span>
						<span className="score-label">Score</span>
					</div>
					<div className="score-details">
						<div className="score-stat">
							<span className="stat-label">Correct:</span>
							<span className="stat-value correct">
								{correctAnswers}/{totalQuestions}
							</span>
						</div>
						<div className="score-stat">
							<span className="stat-label">Time:</span>
							<span className="stat-value">{formatTime(totalTime)}</span>
						</div>
						<div className="score-stat">
							<span className="stat-label">Date:</span>
							<span className="stat-value">
								{session.startTime.toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Wrong Answers Card */}
			{getWrongAnswers().length > 0 && (
				<div className="wrong-answers-card">
					<div className="wrong-answers-header" onClick={toggleWrongAnswers}>
						<div className="wrong-answers-info">
							<h3>Questions You Got Wrong</h3>
							<span className="wrong-answers-count">
								{getWrongAnswers().length} of {totalQuestions} questions
							</span>
						</div>
						<div className="expand-icon">
							{isWrongAnswersExpanded ? "▼" : "▶"}
						</div>
					</div>

					{isWrongAnswersExpanded && (
						<div className="wrong-answers-content">
							{getWrongAnswers().map(({ question, answer, questionNumber }) => (
								<div key={question.id} className="wrong-answer-item">
									<div className="wrong-answer-header">
										<span className="question-number">Q{questionNumber}</span>
										<span className="question-topic">
											{getTopicName(question.topic, topics)}
										</span>
										<span className="question-status incorrect">
											✗ Incorrect
										</span>
									</div>

									<div className="wrong-answer-content">
										<p className="question-text">{question.question}</p>

										<div className="answer-options">
											{question.options.map((option, optionIndex) => {
												const isCorrectAnswer = Array.isArray(
													question.correctAnswer
												)
													? question.correctAnswer.includes(optionIndex)
													: optionIndex === question.correctAnswer;
												const isSelectedAnswer = Array.isArray(
													answer.selectedAnswer
												)
													? answer.selectedAnswer.includes(optionIndex)
													: optionIndex === answer.selectedAnswer;

												return (
													<div
														key={optionIndex}
														className={`answer-option ${
															isCorrectAnswer ? "correct-answer" : ""
														} ${isSelectedAnswer ? "selected-answer" : ""}`}
													>
														<span className="option-letter">
															{String.fromCharCode(65 + optionIndex)}
														</span>
														<span className="option-text">{option}</span>
													</div>
												);
											})}
										</div>

										<div className="explanation">
											<strong>💡 Learning Insight:</strong>{" "}
											{question.explanation}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<div className="topic-breakdown">
				<h3>Performance by Topic</h3>
				<div className="topic-scores">
					{Object.entries(results.topicScores).map(
						([topicId, score]: [string, any]) => {
							if (score.total === 0) return null;

							const topicName = getTopicName(topicId, topics);
							const percentage = score.percentage;
							const isWeak = percentage < 60;
							const isStrong = percentage >= 80;
							const isExpanded = expandedTopics.has(topicId);
							const groupedQuestions = groupQuestionsByTopic(
								session.questions,
								session.answers
							);
							const topicData = groupedQuestions[topicId];

							return (
								<div
									key={topicId}
									className={`topic-score ${
										isWeak ? "weak" : isStrong ? "strong" : "average"
									} ${isExpanded ? "expanded" : ""}`}
								>
									<div
										className="topic-header"
										onClick={() => toggleTopic(topicId)}
									>
										<div className="topic-info">
											<span className="topic-name">{topicName}</span>
											<span className="topic-stats">
												{score.correct}/{score.total} correct
											</span>
										</div>
										<div className="topic-percentage">
											<div className="percentage-bar">
												<div
													className="percentage-fill"
													style={{ width: `${percentage}%` }}
												></div>
											</div>
											<span className="percentage-text">
												{percentage.toFixed(1)}%
											</span>
										</div>
										<div className="expand-icon">{isExpanded ? "▼" : "▶"}</div>
									</div>

									{isExpanded && topicData && (
										<div className="topic-questions">
											{topicData.questions.map((question, index) => {
												const answer = topicData.answers.find(
													(a) => a.questionId === question.id
												);
												const isCorrect = answer?.isCorrect;
												const questionNumber =
													session.questions.findIndex(
														(q) => q.id === question.id
													) + 1;

												return (
													<div
														key={question.id}
														className={`question-detail ${
															isCorrect ? "correct" : "incorrect"
														}`}
													>
														<div className="question-header-detail">
															<span className="question-number">
																Q{questionNumber}
															</span>
															<span
																className={`question-status ${
																	isCorrect ? "correct" : "incorrect"
																}`}
															>
																{isCorrect ? "✓ Correct" : "✗ Incorrect"}
															</span>
														</div>

														<div className="question-content">
															<p className="question-text">
																{question.question}
															</p>

															<div className="answer-options">
																{question.options.map((option, optionIndex) => {
																	const isCorrectAnswer = Array.isArray(
																		question.correctAnswer
																	)
																		? question.correctAnswer.includes(
																				optionIndex
																		  )
																		: optionIndex === question.correctAnswer;
																	const isSelectedAnswer =
																		answer &&
																		Array.isArray(answer.selectedAnswer)
																			? answer.selectedAnswer.includes(
																					optionIndex
																			  )
																			: optionIndex === answer?.selectedAnswer;

																	return (
																		<div
																			key={optionIndex}
																			className={`answer-option ${
																				isCorrectAnswer ? "correct-answer" : ""
																			} ${
																				isSelectedAnswer
																					? "selected-answer"
																					: ""
																			}`}
																		>
																			<span className="option-letter">
																				{String.fromCharCode(65 + optionIndex)}
																			</span>
																			<span className="option-text">
																				{option}
																			</span>
																		</div>
																	);
																})}
															</div>

															{!isCorrect && (
																<div className="explanation">
																	<strong>💡 Learning Insight:</strong>{" "}
																	{question.explanation}
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							);
						}
					)}
				</div>
			</div>

			{results.weakAreas.length > 0 && (
				<div className="weak-areas">
					<h3>Areas for Improvement</h3>
					<div className="weak-areas-list">
						{results.weakAreas.map((topicId: string) => (
							<div key={topicId} className="weak-area-item">
								<span className="weak-area-name">
									{getTopicName(topicId, topics)}
								</span>
								<span className="weak-area-suggestion">
									Consider focusing on this topic in future study sessions
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{session.mode === "study" && (
				<div className="answers-review">
					<h3>Question Review</h3>
					<div className="questions-list">
						{session.questions.map((question, index) => {
							const answer = session.answers.find(
								(a) => a.questionId === question.id
							);
							const isCorrect = answer?.isCorrect;

							return (
								<div
									key={question.id}
									className={`question-review ${
										isCorrect ? "correct" : "incorrect"
									}`}
								>
									<div className="question-header">
										<span className="question-number">Q{index + 1}</span>
										<span className="question-topic">
											{getTopicName(question.topic, topics)}
										</span>
										<span
											className={`question-status ${
												isCorrect ? "correct" : "incorrect"
											}`}
										>
											{isCorrect ? "✓ Correct" : "✗ Incorrect"}
										</span>
									</div>

									<div className="question-content">
										<p className="question-text">{question.question}</p>

										<div className="answer-options">
											{question.options.map((option, optionIndex) => (
												<div
													key={optionIndex}
													className={`answer-option ${
														optionIndex === question.correctAnswer
															? "correct-answer"
															: optionIndex === answer?.selectedAnswer
															? "selected-answer"
															: ""
													}`}
												>
													<span className="option-letter">
														{String.fromCharCode(65 + optionIndex)}
													</span>
													<span className="option-text">{option}</span>
												</div>
											))}
										</div>

										<div className="explanation">
											<strong>Explanation:</strong> {question.explanation}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className="results-actions">
				<button className="action-button primary" onClick={backToHome}>
					Back to Home
				</button>
				{session.mode === "study" && (
					<button
						className="action-button secondary"
						onClick={handleReviewAnswers}
					>
						Review Answers
					</button>
				)}
			</div>
		</div>
	);
};

export default Results;
