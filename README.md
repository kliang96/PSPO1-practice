# PSPO Study App

A comprehensive study application for the **Professional Scrum Product Owner (PSPO)** certification exam. This interactive quiz platform helps you prepare for the PSPO assessment with realistic practice questions, progress tracking, and adaptive learning features.

## 🎯 About This Project

This React TypeScript application simulates the PSPO exam environment and provides an effective study tool for Scrum Product Owner certification. The app includes 168 carefully crafted questions across 8 key topic areas, following the official PSPO exam format and timing.

## ✨ Key Features

### 📚 Study Modes

- **Study Mode**: Practice with immediate feedback and detailed explanations
- **Exam Mode**: Timed simulation of the actual PSPO exam experience
- **Adaptive Learning**: Focus on weak areas with personalized question recommendations

### 📊 Progress Tracking

- **Performance Analytics**: Track your scores and improvement over time
- **Topic Mastery**: Monitor your progress across all 8 Scrum topic areas
- **Weak Area Identification**: Automatic detection of areas needing improvement
- **Study Streaks**: Track your daily study consistency

### 🎯 Question Bank

- **168 Total Questions** across 8 comprehensive topic areas
- **Difficulty Levels**: Easy, Medium, and Hard questions for progressive learning
- **Question Types**: Single-choice and multiple-choice questions
- **Detailed Explanations**: Learn the reasoning behind each answer

### 💾 Data Management

- **Local Storage**: Automatic progress saving in your browser
- **File System Storage**: Export/import your progress data
- **Session History**: Review your past quiz attempts and performance

## 📋 Topics Covered

The application covers all essential PSPO exam topics:

1. **Scrum Theory and Values** (12% weight, 20 questions)

   - Empirical process control, transparency, inspection, and adaptation

2. **Scrum Team Roles** (18% weight, 20 questions)

   - Product Owner, Scrum Master, and Developers responsibilities

3. **Scrum Events** (20% weight, 20 questions)

   - Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective

4. **Scrum Artifacts** (15% weight, 20 questions)

   - Product Backlog, Sprint Backlog, and Increment

5. **Product Backlog Management** (10% weight, 23 questions)

   - Backlog refinement, ordering, and management techniques

6. **Sprint Planning and Execution** (8% weight, 23 questions)

   - Sprint goal, capacity planning, and sprint execution

7. **Evidence-Based Management (EBM)** (12% weight, 21 questions)

   - Using empirical evidence to guide product decisions

8. **Stakeholder Management** (5% weight, 21 questions)
   - Managing stakeholder relationships and expectations

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
│   │   ├── Quiz.tsx           # Quiz interface and logic
│   │   └── Results.tsx        # Results display and analysis
│   ├── context/
│   │   └── AppContext.tsx     # Global state management
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── questionLoader.ts  # Question loading utilities
│   │   ├── quizUtils.ts      # Quiz generation and logic
│   │   └── storageUtils.ts   # Progress storage management
│   ├── App.tsx               # Main application component
│   └── index.tsx             # Application entry point
├── package.json
└── README.md
```

## 🛠️ Technologies Used

- **React 19.1.0** - UI framework
- **TypeScript 4.9.5** - Type safety and development experience
- **React Context API** - State management
- **File System Access API** - Progress data import/export
- **Local Storage API** - Automatic progress saving
- **CSS3** - Styling and responsive design

## 📈 Features in Detail

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

### Progress Analytics

- **Session History**: Track all past quiz attempts
- **Topic Mastery**: Visual progress indicators for each topic
- **Performance Trends**: See your improvement over time
- **Streak Tracking**: Maintain daily study consistency

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
