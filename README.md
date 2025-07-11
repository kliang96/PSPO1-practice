# PSPO Study App

A comprehensive study application for the **Professional Scrum Product Owner (PSPO)** certification exam. This interactive quiz platform helps you prepare for the PSPO assessment with realistic practice questions, progress tracking, and adaptive learning features.

## 🎯 About This Project

This React TypeScript application simulates the PSPO exam environment and provides an effective study tool for Scrum Product Owner certification. The app includes **181 carefully crafted questions** across **9 key topic areas**, following the official PSPO exam format and timing.

## ✨ Key Features

### 📚 Study Modes

- **Study Mode**: Practice with immediate feedback and detailed explanations
- **Exam Mode**: Timed simulation of the actual PSPO exam experience
- **Adaptive Learning**: Focus on weak areas with personalized question recommendations

### 🔒 Enhanced Question Selection

- **Duplicate Prevention**: Advanced algorithms ensure no duplicate questions in the same exam session
- **Multi-Layer Verification**: Triple-layer safety checks (ID tracking, text normalization, similarity detection)
- **Improved Randomization**: Fisher-Yates shuffle algorithm for truly random question distribution
- **Smart Similarity Detection**: Levenshtein distance algorithm catches near-duplicate questions

### 📊 Progress Tracking

- **Performance Analytics**: Track your scores and improvement over time
- **Topic Mastery**: Monitor your progress across all 9 Scrum topic areas
- **Weak Area Identification**: Automatic detection of areas needing improvement
- **Study Streaks**: Track your daily study consistency

### 🎯 Question Bank

- **181 Total Questions** across 9 comprehensive topic areas
- **Difficulty Levels**: Easy, Medium, and Hard questions for progressive learning
- **Question Types**: Single-choice and multiple-choice questions
- **Detailed Explanations**: Learn the reasoning behind each answer
- **Quality Assurance**: Rigorous duplicate detection and removal processes

### 💾 Data Management

- **Local Storage**: Automatic progress saving in your browser
- **File System Storage**: Export/import your progress data
- **Session History**: Review your past quiz attempts and performance

## 🚀 Recent Improvements

### Version 2.3.0 - Enhanced Results & UI Improvements

- **🎨 Enhanced**: Comprehensive Results component with detailed question analysis
- **📊 Improved**: Interactive topic breakdown with expandable question reviews
- **🔍 Added**: Wrong answers section with detailed explanations
- **✅ Enhanced**: Visual indicators for correct/incorrect answers
- **🎯 Improved**: Better question numbering and status tracking
- **💡 Added**: Learning insights and explanations for all incorrect answers
- **📱 Enhanced**: Responsive design and improved mobile experience

### Version 2.2.0 - React Router Integration & Enhanced Navigation

- **🔧 Added**: React Router for industry-standard navigation
- **⚡ Improved**: Page refresh persistence - maintain quiz progress and results
- **🎯 Enhanced**: Bookmarkable URLs for quiz sessions and results
- **📊 Added**: URL-based session management with automatic recovery
- **🛡️ Strengthened**: Session validation and error handling
- **🔄 Implemented**: Browser history support (back/forward buttons)

### URL Structure

The application now uses clean, bookmarkable URLs:

- `/` - Home page (quiz selection and settings)
- `/quiz/:sessionId` - Active quiz session
- `/results/:sessionId` - Quiz results and analysis

### Session Management

- **Automatic Persistence**: Quiz progress is saved automatically and survives page refreshes
- **Session Recovery**: Interrupted sessions can be resumed from where you left off
- **Unique Session IDs**: Each quiz session has a unique identifier for tracking
- **Session Cleanup**: Automatic cleanup of expired sessions (24+ hours old)
- **Storage Optimization**: Only the 5 most recent sessions are kept in storage

### Version 2.1.0 - Enhanced Question Selection System

- **🔧 Fixed**: Duplicate question prevention with comprehensive ID tracking
- **⚡ Improved**: Fisher-Yates shuffle algorithm for better randomization
- **🎯 Enhanced**: Multi-layer similarity detection using Levenshtein distance
- **📊 Added**: Detailed logging and debugging capabilities
- **🛡️ Strengthened**: Error handling with automatic cleanup mechanisms

### Technical Enhancements

- **Primary Duplicate Prevention**: Question ID tracking using `Set<number>`
- **Secondary Text Checking**: Normalized text comparison with punctuation removal
- **Tertiary Similarity Detection**: Word-based and character-based similarity algorithms
- **Deterministic Selection**: Predictable, reliable question selection process
- **Comprehensive Coverage**: All question loading functions updated with duplicate prevention

## 📋 Topics Covered

The application covers all essential PSPO exam topics:

1. **Scrum Theory and Values** (12% weight, 16 questions)

   - Empirical process control, transparency, inspection, and adaptation

2. **Scrum Team Roles** (18% weight, 20 questions)

   - Product Owner, Scrum Master, and Developers responsibilities

3. **Scrum Events** (20% weight, 20 questions)

   - Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective

4. **Scrum Artifacts** (15% weight, 20 questions)

   - Product Backlog, Sprint Backlog, and Increment

5. **Product Backlog Management** (10% weight, 18 questions)

   - Backlog refinement, ordering, and management techniques

6. **Sprint Planning and Execution** (8% weight, 23 questions)

   - Sprint goal, capacity planning, and sprint execution

7. **Evidence-Based Management (EBM)** (12% weight, 21 questions)

   - Using empirical evidence to guide product decisions

8. **Stakeholder Management** (5% weight, 21 questions)

   - Managing stakeholder relationships and expectations

9. **Agile Leadership** (15% weight, 22 questions)
   - Leadership principles and practices for successful Agile transformation

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/kliang96/PSPO1-practice.git
   cd pspo-study-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

4. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - The app will automatically reload when you make changes

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## 🎮 How to Use

### Starting a Quiz Session

1. **Select Study Mode**: Choose between Study (with explanations) or Exam (timed simulation)
2. **Configure Settings**:
   - Number of questions (1-80)
   - Topic selection (choose specific areas or all topics)
   - Enable "Focus on Weak Areas" for personalized recommendations
3. **Start Quiz**: Begin your practice session

### During the Quiz

- **Study Mode**: Get immediate feedback and explanations after each question
- **Exam Mode**: Navigate between questions, mark for review, and submit at the end
- **Time Management**: Monitor your remaining time (follows PSPO format: 80 questions = 60 minutes)

### After Completion

- **Review Results**: See your overall score and topic-specific performance
- **Analyze Weak Areas**: Identify topics that need more attention
- **Track Progress**: Monitor your improvement over time

### Data Management

- **Auto-Save**: Your progress is automatically saved locally
- **Export Progress**: Download your progress data as a JSON file
- **Import Progress**: Load previously saved progress data
- **Reset Progress**: Clear all progress data and start fresh

## 🏗️ Project Structure

```
pspo-study-app/
├── public/
│   ├── data/
│   │   ├── questions/          # Question data files by topic
│   │   └── questions-index.json # Topic metadata and structure
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Home.tsx           # Main landing page with settings
│   │   ├── Home.test.tsx      # Tests for Home component
│   │   ├── Quiz.tsx           # Quiz interface and logic
│   │   └── Results.tsx        # Results display and analysis
│   ├── context/
│   │   └── AppContext.tsx     # Global state management
│   ├── router/
│   │   ├── AppRouter.tsx      # Main routing configuration
│   │   └── ProtectedRoute.tsx # Session validation and route protection
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── questionLoader.ts  # Question loading utilities (with duplicate prevention)
│   │   ├── quizUtils.ts      # Quiz generation and logic (enhanced algorithms)
│   │   ├── sessionUtils.ts   # Session management and persistence
│   │   └── storageUtils.ts   # Progress storage management
│   ├── App.tsx               # Main application component
│   └── index.tsx             # Application entry point
├── ROUTER_MIGRATION_PLAN.md  # Detailed migration documentation
├── package.json
└── README.md
```

## 🛠️ Technologies Used

- **React 19.1.0** - UI framework
- **React Router 6.30.1** - Client-side routing and navigation
- **TypeScript 4.9.5** - Type safety and development experience
- **React Context API** - State management
- **File System Access API** - Progress data import/export
- **Browser localStorage** - Session persistence and recovery
- **Local Storage API** - Automatic progress saving
- **CSS3** - Styling and responsive design

## 📈 Features in Detail

### Enhanced Question Selection Algorithm

The app uses advanced algorithms to ensure question quality:

- **Multi-Layer Duplicate Prevention**: ID tracking, text normalization, and similarity detection
- **Fisher-Yates Shuffle**: Proper randomization algorithm for fair question distribution
- **Levenshtein Distance**: Accurate similarity measurement to catch near-duplicates
- **Deterministic Selection**: Predictable, reliable question selection process
- **Automatic Cleanup**: Error handling with automatic duplicate removal

### Adaptive Learning Algorithm

The app uses your performance history to:

- Identify topics where you score below 70%
- Recommend focused study sessions on weak areas
- Increase question frequency for challenging topics
- Track improvement trends over time

### Exam Simulation

- **Realistic Timing**: Matches official PSPO exam format (45 seconds per question)
- **Question Navigation**: Jump between questions, mark for review
- **Final Review**: Review all answers before submission
- **No Immediate Feedback**: Authentic exam experience
- **Guaranteed Uniqueness**: No duplicate questions in the same exam session

### Progress Analytics

- **Session History**: Track all past quiz attempts
- **Topic Mastery**: Visual progress indicators for each topic
- **Performance Trends**: See your improvement over time

## 🔍 Quality Assurance

### Duplicate Prevention System

The application implements a comprehensive three-layer duplicate prevention system:

1. **Primary Layer**: Question ID tracking using Set data structure
2. **Secondary Layer**: Normalized text comparison with punctuation removal
3. **Tertiary Layer**: Advanced similarity detection using Levenshtein distance algorithm

### Algorithm Details

- **Fisher-Yates Shuffle**: Ensures truly random question distribution
- **Levenshtein Distance**: Measures text similarity with 80% threshold
- **Word-based Similarity**: Checks for common significant words (60% threshold)
- **Final Verification**: Post-selection duplicate check with automatic cleanup

## 🤝 Contributing

This is a personal study project, but suggestions and improvements are welcome! Feel free to:

- Report bugs or issues
- Suggest new features
- Improve question content or explanations
- Enhance the user interface

## 📝 License

This project is for educational purposes. Question content is based on publicly available Scrum.org materials and the official Scrum Guide.

## 🔗 Resources

- [Scrum.org](https://www.scrum.org) - Official Scrum certification body
- [Scrum Guide](https://scrumguides.org) - Official Scrum framework documentation
- [PSPO Assessment](https://www.scrum.org/professional-scrum-product-owner-i-certification) - Official certification information

---

**Good luck with your PSPO certification journey!** 🎓
