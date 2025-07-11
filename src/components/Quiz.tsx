import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { UserAnswer, DraftAnswer } from "../types";
import {
	formatTime,
	calculateTimeSpent,
	getTopicName,
} from "../utils/quizUtils";
import { loadTopics } from "../utils/quizUtils";
import { Topic } from "../types";
import { loadSessionFromStorage } from "../utils/sessionUtils";
import "./Quiz.css";

const Quiz: React.FC = () => {
	const { state, dispatch } = useApp();
	const { sessionId } = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const [selectedAnswer, setSelectedAnswer] = useState<
		number | number[] | null
	>(null);

	// Helper function to compare two arrays for equality
	const arraysEqual = (a: number[], b: number[]): boolean => {
		if (a.length !== b.length) return false;
		const sortedA = [...a].sort((x, y) => x - y);
		const sortedB = [...b].sort((x, y) => x - y);
		return sortedA.every((val, index) => val === sortedB[index]);
	};
	const [showExplanation, setShowExplanation] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
	const [topics, setTopics] = useState<Topic[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
	const [showExitConfirmation, setShowExitConfirmation] = useState(false);
	const [showTimeUpModal, setShowTimeUpModal] = useState(false);

	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const session = state.currentSession;
	const isExamMode = session?.mode === "exam";
	const currentQuestionIndex = session?.currentQuestionIndex || 0;
	const currentQuestion = session?.questions[currentQuestionIndex];

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
		};

		validateAndLoadSession();
	}, [sessionId, state.currentSession, dispatch, navigate]);

	// Load topics
	useEffect(() => {
		const loadTopicsData = async () => {
			try {
				const topicsData = await loadTopics();
				setTopics(topicsData);
			} catch (error) {
				console.error("Failed to load topics:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadTopicsData();
	}, []);

	// Timer effect
	useEffect(() => {
		if (!session || !state.remainingTime || state.isPaused) return;

		timerRef.current = setInterval(() => {
			dispatch({
				type: "UPDATE_REMAINING_TIME",
				payload: state.remainingTime! - 1,
			});
		}, 1000);

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [session, state.remainingTime, state.isPaused, dispatch]);

	// Auto-resume on interaction
	useEffect(() => {
		const handleUserInteraction = (e: Event) => {
			if (state.isPaused && !showTimeUpModal) {
				// Check if click is on UI controls - if so, ignore
				const target = e.target as HTMLElement;
				if (
					target.closest(".pause-button") ||
					target.closest(".submit-button") ||
					target.closest(".quiz-controls") ||
					target.closest(".question-nav-button") ||
					target.closest(".submit-confirmation-overlay") ||
					target.closest(".exit-confirmation-overlay") ||
					target.closest(".time-up-overlay") ||
					target.closest(".exit-button")
				) {
					return; // Don't resume on control clicks
				}
				dispatch({ type: "RESUME_SESSION" });
			}
		};

		if (state.isPaused) {
			document.addEventListener("click", handleUserInteraction);
			document.addEventListener("keydown", handleUserInteraction);

			return () => {
				document.removeEventListener("click", handleUserInteraction);
				document.removeEventListener("keydown", handleUserInteraction);
			};
		}
	}, [state.isPaused, showTimeUpModal, dispatch]);

	// Check for time up
	useEffect(() => {
		if (state.remainingTime === 0 && !showTimeUpModal) {
			// Time up - pause quiz and show time up modal
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}

			// Pause the session
			dispatch({ type: "PAUSE_SESSION" });

			// Show time up modal
			setShowTimeUpModal(true);
		}
	}, [state.remainingTime, showTimeUpModal, dispatch]);

	// Update question start time when question changes
	useEffect(() => {
		setQuestionStartTime(new Date());

		// Mark question as visited
		if (currentQuestion) {
			dispatch({
				type: "UPDATE_QUESTION_STATUS",
				payload: {
					questionId: currentQuestion.id,
					isAnswered: false,
					isVisited: true,
				},
			});
		}
	}, [currentQuestionIndex, currentQuestion, dispatch]);

	// Load existing draft answer when question changes
	useEffect(() => {
		if (currentQuestion && session?.draftAnswers) {
			const existingDraft = session.draftAnswers.find(
				(draft) => draft.questionId === currentQuestion.id
			);
			setSelectedAnswer(existingDraft?.selectedAnswer ?? null);
		} else {
			setSelectedAnswer(null);
		}
		setShowExplanation(false);
		setHasSubmitted(false); // Reset submission state for new question
	}, [currentQuestion, session?.draftAnswers]);

	const handleFinishQuiz = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		const totalTime = session?.startTime
			? Math.round((new Date().getTime() - session.startTime.getTime()) / 1000)
			: 0;

		// Calculate actual score
		const correctAnswers =
			session?.answers.filter((a) => a.isCorrect).length || 0;
		const score =
			session?.questions.length && session.questions.length > 0
				? (correctAnswers / session.questions.length) * 100
				: 0;

		dispatch({ type: "END_SESSION", payload: { score, totalTime } });
		if (sessionId) {
			navigate(`/results/${sessionId}`);
		}
	}, [session, dispatch, sessionId, navigate]);

	const handleSubmitExam = useCallback(() => {
		if (!session?.draftAnswers) return;

		// Convert draft answers to final answers
		const finalAnswers: UserAnswer[] = session.draftAnswers.map((draft) => {
			const question = session.questions.find((q) => q.id === draft.questionId);
			const isCorrect =
				question?.type === "multiple"
					? Array.isArray(draft.selectedAnswer) &&
					  Array.isArray(question.correctAnswer) &&
					  arraysEqual(
							draft.selectedAnswer,
							question.correctAnswer as number[]
					  )
					: draft.selectedAnswer === question?.correctAnswer;

			return {
				questionId: draft.questionId,
				selectedAnswer: draft.selectedAnswer,
				isCorrect,
				timeSpent: draft.timeSpent,
			};
		});

		dispatch({ type: "SUBMIT_EXAM", payload: finalAnswers });
		handleFinishQuiz();
	}, [session, dispatch, handleFinishQuiz]);

	const handleAnswerSelect = (answerIndex: number) => {
		if (currentQuestion!.type === "multiple") {
			// Handle multiple choice
			const currentAnswers = Array.isArray(selectedAnswer)
				? selectedAnswer
				: [];
			let newAnswers: number[];

			if (currentAnswers.includes(answerIndex)) {
				// Remove if already selected
				newAnswers = currentAnswers.filter((a) => a !== answerIndex);
			} else {
				// Add if not selected
				newAnswers = [...currentAnswers, answerIndex].sort((a, b) => a - b);
			}

			setSelectedAnswer(newAnswers.length > 0 ? newAnswers : null);

			if (isExamMode) {
				// In exam mode, save as draft answer
				const timeSpent = calculateTimeSpent(questionStartTime, new Date());
				const draftAnswer: DraftAnswer = {
					questionId: currentQuestion!.id,
					selectedAnswer: newAnswers.length > 0 ? newAnswers : [],
					timeSpent,
				};

				dispatch({ type: "SAVE_DRAFT_ANSWER", payload: draftAnswer });
			}
			// In study mode, do not show explanation immediately - wait for Submit
		} else {
			// Handle single choice
			setSelectedAnswer(answerIndex);

			if (isExamMode) {
				// In exam mode, save as draft answer
				const timeSpent = calculateTimeSpent(questionStartTime, new Date());
				const draftAnswer: DraftAnswer = {
					questionId: currentQuestion!.id,
					selectedAnswer: answerIndex,
					timeSpent,
				};

				dispatch({ type: "SAVE_DRAFT_ANSWER", payload: draftAnswer });
			}
			// In study mode, do not show explanation immediately - wait for Submit
		}
	};

	const handleSubmit = () => {
		if (selectedAnswer === null || isExamMode || hasSubmitted) return;

		// Show explanation
		setShowExplanation(true);
		setHasSubmitted(true);

		// Record the answer
		const timeSpent = calculateTimeSpent(questionStartTime, new Date());
		const isCorrect =
			currentQuestion!.type === "multiple"
				? Array.isArray(selectedAnswer) &&
				  Array.isArray(currentQuestion!.correctAnswer) &&
				  arraysEqual(
						selectedAnswer,
						currentQuestion!.correctAnswer as number[]
				  )
				: selectedAnswer === currentQuestion!.correctAnswer;

		const answer: UserAnswer = {
			questionId: currentQuestion!.id,
			selectedAnswer,
			isCorrect,
			timeSpent,
		};

		dispatch({ type: "ANSWER_QUESTION", payload: answer });

		// Mark question as answered
		dispatch({
			type: "UPDATE_QUESTION_STATUS",
			payload: {
				questionId: currentQuestion!.id,
				isAnswered: true,
				isVisited: true,
			},
		});
	};

	const handleNextQuestion = () => {
		// In study mode, answers are recorded by handleSubmit, not here
		// In exam mode, answers are recorded as draft answers during selection

		if (currentQuestionIndex < session!.questions.length - 1) {
			dispatch({
				type: "NAVIGATE_TO_QUESTION",
				payload: currentQuestionIndex + 1,
			});
		} else if (!isExamMode) {
			handleFinishQuiz();
		}
	};

	const handlePreviousQuestion = () => {
		if (currentQuestionIndex > 0) {
			dispatch({
				type: "NAVIGATE_TO_QUESTION",
				payload: currentQuestionIndex - 1,
			});
		}
	};

	const handleQuestionNavigation = (questionIndex: number) => {
		dispatch({ type: "NAVIGATE_TO_QUESTION", payload: questionIndex });
	};

	const handlePauseResume = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent auto-resume from being triggered
		if (state.isPaused) {
			dispatch({ type: "RESUME_SESSION" });
		} else {
			dispatch({ type: "PAUSE_SESSION" });
		}
	};

	const handleExitExam = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowExitConfirmation(true);
	};

	const handleConfirmExit = () => {
		// Clear timer
		if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		// Clear session completely without saving any progress
		dispatch({ type: "CLEAR_SESSION" });

		// Navigate to home
		navigate("/");
	};

	const handleCancelExit = () => {
		setShowExitConfirmation(false);
	};

	const getOptionClass = (index: number) => {
		if (selectedAnswer === null || !currentQuestion) return "option";

		const isSelected = Array.isArray(selectedAnswer)
			? selectedAnswer.includes(index)
			: selectedAnswer === index;

		if (isExamMode) {
			// In exam mode, only show selection, no correctness
			return isSelected ? "option selected" : "option";
		}

		// In study mode, show correctness only after submission
		if (!hasSubmitted) {
			// Before submission, only show selection state
			return isSelected ? "option selected" : "option";
		}

		// After submission, show correctness
		const correctAnswers = Array.isArray(currentQuestion.correctAnswer)
			? currentQuestion.correctAnswer
			: [currentQuestion.correctAnswer as number];

		const isCorrectOption = correctAnswers.includes(index);

		if (isCorrectOption) {
			return "option correct";
		}

		if (isSelected && !isCorrectOption) {
			return "option incorrect";
		}

		return "option";
	};

	const getQuestionStatus = (questionIndex: number) => {
		const question = session?.questions[questionIndex];
		const status = session?.questionStatuses?.find(
			(s) => s.questionId === question?.id
		);

		if (!status) return "unvisited";
		if (status.isAnswered) return "answered";
		if (status.isVisited) return "visited";
		return "unvisited";
	};

	const getAnsweredCount = () => {
		return session?.questionStatuses?.filter((s) => s.isAnswered).length || 0;
	};

	if (!session || isLoading) {
		return <div className="quiz-loading">Loading quiz...</div>;
	}

	const progress =
		((currentQuestionIndex + 1) / session.questions.length) * 100;
	const answeredCount = getAnsweredCount();
	const totalQuestions = session.questions.length;

	return (
		<div className="quiz-container">
			<div className="quiz-header">
				<div className="quiz-info">
					<h2>{isExamMode ? "Exam Mode" : "Study Mode"}</h2>
					<div className="question-counter">
						Question {currentQuestionIndex + 1} of {session.questions.length}
					</div>
					{isExamMode && (
						<div className="answer-progress">
							{answeredCount} of {totalQuestions} answered
						</div>
					)}
				</div>

				<div className="quiz-controls">
					{isExamMode && state.remainingTime !== undefined && (
						<div className="timer">
							<span className="timer-label">Time:</span>
							<span
								className={`timer-value ${
									state.remainingTime < 300 ? "warning" : ""
								}`}
							>
								{formatTime(state.remainingTime)}
							</span>
						</div>
					)}

					<button className="pause-button" onClick={handlePauseResume}>
						{state.isPaused ? "Resume" : "Pause"}
					</button>

					{isExamMode && (
						<>
							<button
								className="exit-button"
								onClick={handleExitExam}
								style={{ backgroundColor: "#dc3545", marginRight: "10px" }}
							>
								Exit Exam
							</button>
							<button
								className="submit-button"
								onClick={() => setShowSubmitConfirmation(true)}
							>
								Submit Exam
							</button>
						</>
					)}
				</div>
			</div>

			<div className="quiz-content">
				{isExamMode && (
					<div className="question-navigation">
						<h3>Questions</h3>
						<div className="question-grid">
							{session.questions.map((_, index) => (
								<button
									key={index}
									className={`question-nav-button ${getQuestionStatus(index)} ${
										index === currentQuestionIndex ? "current" : ""
									}`}
									onClick={() => handleQuestionNavigation(index)}
								>
									{index + 1}
								</button>
							))}
						</div>
					</div>
				)}

				<div className="question-content">
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{ width: `${progress}%` }}
						></div>
					</div>

					<div className="question-header">
						<span className="topic-tag">
							{getTopicName(currentQuestion!.topic, topics)}
						</span>
						<span className="difficulty-tag">
							{currentQuestion!.difficulty}
						</span>
					</div>

					<h3 className="question-text">{currentQuestion!.question}</h3>
					{currentQuestion!.type === "multiple" && (
						<p className="multiple-choice-hint">Choose all that apply</p>
					)}

					<div className="options-container">
						{currentQuestion!.options.map((option, index) => (
							<button
								key={index}
								className={getOptionClass(index)}
								onClick={() => handleAnswerSelect(index)}
							>
								<span className="option-letter">
									{String.fromCharCode(65 + index)}
								</span>
								<span className="option-text">{option}</span>
							</button>
						))}
					</div>

					{showExplanation && !isExamMode && (
						<div className="explanation">
							<h4>Explanation:</h4>
							<p>{currentQuestion!.explanation}</p>
						</div>
					)}

					<div className="navigation-buttons">
						<button
							className="nav-button prev"
							onClick={handlePreviousQuestion}
							disabled={currentQuestionIndex === 0}
						>
							Previous
						</button>

						{!isExamMode && (
							<>
								<button
									className="nav-button submit"
									onClick={handleSubmit}
									disabled={selectedAnswer === null || hasSubmitted}
								>
									Submit
								</button>
								<button
									className="nav-button next"
									onClick={handleNextQuestion}
									disabled={!hasSubmitted}
								>
									{currentQuestionIndex === session.questions.length - 1
										? "Finish Quiz"
										: "Next"}
								</button>
							</>
						)}

						{isExamMode && (
							<button
								className="nav-button next"
								onClick={handleNextQuestion}
								disabled={currentQuestionIndex === session.questions.length - 1}
							>
								Next
							</button>
						)}
					</div>
				</div>
			</div>

			{showSubmitConfirmation && (
				<div className="submit-confirmation-overlay">
					<div className="submit-confirmation">
						<h3>Submit Exam?</h3>
						<p>
							You have answered {answeredCount} out of {totalQuestions}{" "}
							questions.
						</p>
						{answeredCount < totalQuestions && (
							<p className="warning">
								You have {totalQuestions - answeredCount} unanswered questions.
							</p>
						)}
						<p>Are you sure you want to submit your exam?</p>
						<div className="confirmation-buttons">
							<button
								className="cancel-button"
								onClick={() => setShowSubmitConfirmation(false)}
							>
								Cancel
							</button>
							<button className="confirm-button" onClick={handleSubmitExam}>
								Submit Exam
							</button>
						</div>
					</div>
				</div>
			)}

			{showExitConfirmation && (
				<div className="exit-confirmation-overlay">
					<div className="exit-confirmation">
						<h3>Exit Exam?</h3>
						<p className="warning">
							⚠️ Warning: Your exam progress will be lost!
						</p>
						<p>
							Are you sure you want to exit this exam? All your answers and
							progress will be permanently lost and will not be saved to your
							study history.
						</p>
						<div className="confirmation-buttons">
							<button className="cancel-button" onClick={handleCancelExit}>
								Cancel
							</button>
							<button
								className="confirm-button exit-confirm"
								onClick={handleConfirmExit}
								style={{ backgroundColor: "#dc3545" }}
							>
								Exit Exam
							</button>
						</div>
					</div>
				</div>
			)}

			{showTimeUpModal && (
				<div className="time-up-overlay">
					<div className="time-up-modal">
						<h3>⏰ Time's Up!</h3>
						<p>
							The exam time has ended. You have answered {answeredCount} out of{" "}
							{totalQuestions} questions.
						</p>
						{answeredCount < totalQuestions && (
							<p className="warning">
								You have {totalQuestions - answeredCount} unanswered questions.
							</p>
						)}
						<p>Click Submit to finish your exam.</p>
						<div className="confirmation-buttons">
							<button className="confirm-button" onClick={handleSubmitExam}>
								Submit Exam
							</button>
						</div>
					</div>
				</div>
			)}

			{state.isPaused && !showTimeUpModal && (
				<div className="pause-overlay">
					<div className="pause-message">
						<h3>Quiz Paused</h3>
						<p>Click anywhere or press any key to resume</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default Quiz;
