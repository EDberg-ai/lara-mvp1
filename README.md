# LARA - Learning Assessment & Response Assistant

A real-time classroom feedback system that helps teachers provide AI-generated, personalized feedback to students. Built with a modern React frontend and Express backend, featuring WebSocket communication for instant feedback delivery.

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite** - Fast development and type safety
- **Tailwind CSS** (CDN) + **Lucide React** icons - Styling and iconography
- **Socket.io Client** - Real-time WebSocket communication
- **Framer Motion** - Smooth animations and transitions
- **Recharts** - Analytics and data visualization

### Backend
- **Express 5** + **TypeScript** - REST API server
- **PostgreSQL** + **Prisma ORM** - Persistent data storage
- **Redis** (ioredis) - Live session data with 16-hour TTL
- **Socket.io** - WebSocket server for real-time updates
- **Anthropic Claude API** - AI-powered feedback generation
- **JWT** + **bcrypt** - Authentication and password hashing

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   Claude AI     │
│  React + Vite   │◀────│  Express + WS   │◀────│   (Anthropic)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              ┌──────────┐              ┌──────────┐
              │  Redis   │              │ Postgres │
              │  (Live)  │              │ (Persist)│
              └──────────┘              └──────────┘
```

## Key Features

- **Real-time Feedback** - Instant delivery via WebSocket when teachers approve
- **AI-Powered Feedback Generation** - Claude AI analyzes submissions with mastery detection
- **Dual-Mode Stores** - Demo mode (localStorage) vs production (backend API)
- **Task Codes** - Kahoot-style 6-digit alphanumeric codes for easy session joining
- **Revision Tracking** - Students can revise up to 3 times with feedback history
- **Folder Organization** - Teachers organize tasks into folders
- **Quota/Credit System** - Tier-based monthly AI usage limits for teachers

## Data Flow

### Student Flow
```
Enter Code → Join Session → Submit Work → [Wait] → Receive Feedback → Revise (optional)
```

### Teacher Flow
```
Login → Create Task → View Dashboard → Generate Feedback → Review/Edit → Approve → Release
```

## WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `student:join-room` | Client → Server | Join session room |
| `teacher:join-room` | Client → Server | Teacher monitors session |
| `student-joined` | Server → Client | Notify teacher of new student |
| `student-submitted` | Server → Client | Notify teacher of submission |
| `feedback-ready` | Server → Client | Deliver approved feedback to student |

## Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| **Teacher** | Authentication, tier level, quota tracking |
| **Task** | Title, prompt, success criteria, taskCode |
| **TaskSession** | Live/historical sessions, analytics |
| **Student** | Ephemeral, session-scoped student records |
| **StudentSubmission** | Content, revision count, status |
| **SubmissionFeedback** | AI-generated feedback JSON |
| **Folder** | Task organization hierarchy |
| **AiUsageLog** | Quota and usage tracking |

## AI Feedback Generation

- **Model**: `claude-haiku-4-5-20251001`
- **Input**: Task prompt + Success criteria + Student work
- **Output**: Structured JSON containing:
  - `goal` - Learning objective summary
  - `masteryAchieved` - Boolean mastery determination
  - `strengths[]` - What the student did well (with text anchors/quotes)
  - `growthAreas[]` - Areas for improvement (with text anchors)
  - `nextSteps[]` - Actionable items for the student

## Hybrid Data Storage

| Data | Redis | Postgres | Reason |
|------|:-----:|:--------:|--------|
| Live students | ✓ | ✗ | Real-time access, 16h TTL |
| Submissions | ✓ | ✓ | Fast writes, then persisted |
| Tasks | ✗ | ✓ | Permanent content |
| Teachers | ✗ | ✓ | Auth data |

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend (`.env.local`)
```
VITE_API_URL=http://localhost:3001
```

## Running Locally

### Prerequisites
- Node.js >= 20.19.0
- PostgreSQL database
- Redis server
- Anthropic API key

### Installation
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### Start Development Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

## Project Structure

```
/
├── components/
│   ├── student/        # StudentEntry, FeedbackView
│   ├── teacher/        # Dashboard, ReviewView
│   └── ui/             # Button, Card, Badge, etc.
├── lib/
│   ├── api.ts          # HTTP client
│   ├── useSocket.ts    # WebSocket hooks
│   ├── store.ts        # Local state (demo mode)
│   └── useBackendStore.ts  # API state (production)
├── backend/
│   ├── src/
│   │   ├── routes/     # auth, tasks, sessions, folders
│   │   ├── lib/        # redis, socket, prisma
│   │   └── services/   # feedback generation
│   └── prisma/
│       └── schema.prisma
└── types.ts            # Shared TypeScript types
```

## Key Algorithms

- **Task Code Generation**: 6-character alphanumeric codes excluding confusing characters (I, O, L, 0, 1)
- **Quota Management**: Monthly reset with tier-based limits (Free, Basic, Premium)
- **Session Persistence**: Redis → Postgres migration when sessions end for archival
- **Mastery Detection**: AI-driven analysis with teacher override capability

## Deployment

Configured for Railway deployment:
- **Backend**: Deploys from `backend/` directory
- **Frontend**: Deploys from root directory (Vite build)

## License

ISC
