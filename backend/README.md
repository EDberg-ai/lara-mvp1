# LARA Backend API

Express.js backend for LARA (Learning Assessment & Response Assistant).

## Tech Stack

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM (PostgreSQL)
- **Redis** - Session/ephemeral data storage
- **Anthropic Claude** - AI feedback generation

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start development server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:5173
```

## Railway Deployment

### Option 1: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (create new service)
railway link

# Set root directory for monorepo
railway service:set-root-dir backend

# Deploy
railway up
```

### Option 2: Deploy via Railway Dashboard

1. Go to Railway dashboard
2. Create new service from GitHub
3. Select your repository
4. Set **Root Directory** to `backend`
5. Add environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `REDIS_URL` - Your Redis connection string
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `JWT_SECRET` - A secure random string
   - `FRONTEND_URL` - Your Netlify frontend URL
   - `NODE_ENV` - `production`

## API Endpoints

### Auth
- `POST /api/auth/register` - Teacher registration
- `POST /api/auth/login` - Teacher login
- `GET /api/auth/me` - Get current teacher
- `POST /api/auth/session/join` - Student joins via task code

### Tasks
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:taskId` - Get single task
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:taskId` - Update task
- `PATCH /api/tasks/:taskId/status` - Activate/deactivate task
- `DELETE /api/tasks/:taskId` - Delete task

### Folders
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `PUT /api/folders/:folderId` - Update folder
- `DELETE /api/folders/:folderId` - Delete folder

### Sessions
- `GET /api/sessions/:sessionId/dashboard` - Teacher dashboard
- `POST /api/sessions/:sessionId/submit` - Student submits work
- `POST /api/sessions/:sessionId/generate-feedback` - Generate AI feedback
- `PATCH /api/sessions/:sessionId/feedback/:studentId/approve` - Approve feedback
- `PATCH /api/sessions/:sessionId/feedback/:studentId/edit` - Edit feedback
- `GET /api/sessions/:sessionId/feedback/:studentId` - Poll for feedback
- `GET /api/sessions/usage` - Get AI usage stats

### Health
- `GET /health` - Health check
