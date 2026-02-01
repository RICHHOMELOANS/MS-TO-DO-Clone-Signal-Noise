# Signal Over Noise

A productivity PWA built on the Pareto principle: focus on the 20% that drives 80% of your progress. Features an MS To-Do inspired interface with multi-device sync.

**Philosophy**: "Amplify the Signal. Mute the Noise. Own the Mission."

## Deployment & Repository

- **GitHub**: https://github.com/RICHHOMELOANS/MS-TO-DO-Clone-Signal-Noise
- **Branch**: `main`

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.4 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 with `@tailwindcss/postcss` |
| Theme | next-themes for dark/light mode |
| Icons | Lucide React |
| State | React hooks + localStorage + Vercel Blob sync |
| Cloud Storage | Vercel Blob (`@vercel/blob`) |
| UI Primitives | Radix UI (checkbox, dialog, dropdown, etc.) |

## Project Structure

```
signal-over-noise/
├── src/
│   ├── app/
│   │   ├── api/sync/
│   │   │   ├── route.ts          # GET/POST sync data (176 lines)
│   │   │   ├── setup/route.ts    # Create new sync account (122 lines)
│   │   │   └── login/route.ts    # Login with code + PIN (86 lines)
│   │   ├── globals.css           # Tailwind v4 theme variables
│   │   ├── layout.tsx            # Root layout with ThemeProvider
│   │   ├── page.tsx              # Home page (renders TodoList)
│   │   ├── icon.tsx              # Dynamic favicon (S on dark bg)
│   │   └── apple-icon.tsx        # Apple touch icon
│   ├── components/
│   │   ├── todo-list.tsx         # Main app component (~1547 lines)
│   │   ├── sidebar.tsx           # Collapsible sidebar (~245 lines)
│   │   ├── task-detail-panel.tsx # Task editing panel (~267 lines)
│   │   ├── sync-modal.tsx        # Sync dialogs (~416 lines)
│   │   └── theme-provider.tsx    # next-themes wrapper (12 lines)
│   └── lib/
│       ├── sync.ts               # Auth utilities & types (~130 lines)
│       └── utils.ts              # cn() class merging utility
├── docs/
│   └── session-notes.md          # Development history
├── public/
│   └── manifest.json             # PWA manifest
├── ms-todo-clone.jsx             # Standalone MS To-Do prototype (~807 lines)
└── .env.local                    # BLOB_READ_WRITE_TOKEN
```

## Core Components

### todo-list.tsx (Main Application)

**State Management:**
- `todos` - Task array (localStorage persisted)
- `timerState` - 14-hour countdown with pause tracking
- `recurringTasks` - Auto-add tasks on specific weekdays
- `pauseLogs` - Pause events with reasons and timestamps
- `customLists` - User-created task lists
- `syncState` - Multi-device sync credentials

**Sub-Components:**
| Component | Purpose |
|-----------|---------|
| `TodoList` | Main orchestrator with all state |
| `ThemeToggle` | Dark/light mode (hydration-safe) |
| `TimerCard` | 14-hour countdown with pause/resume |
| `ProgressCard` | Task completion percentage |
| `TaskForm` | New task input |
| `TaskItem` | Individual task (React.memo optimized) |
| `TaskList` | Task container |
| `RecurringTaskItem` | Task with weekday toggles |
| `PauseModal` | Pause reason selector |
| `Manifesto` | Signal philosophy display |

### sidebar.tsx
- Collapsible sidebar (hamburger toggle)
- Smart lists: My Day, Important, Planned, Tasks
- Custom lists with add/delete
- Search input with task filtering
- Unfinished task count badges

### task-detail-panel.tsx
- Slide-out panel for task editing
- Steps (subtasks) with toggle/delete
- Due date picker
- Notes textarea
- My Day and Important toggles
- Task deletion

### sync-modal.tsx
- Setup mode: Create PIN, get sync code
- Login mode: Enter code + PIN
- Status indicators and error handling
- SyncButton component

## Data Structures

### Todo
```typescript
interface Todo {
  id: string              // crypto.randomUUID()
  text: string            // Task description
  completed: boolean
  createdAt: number       // Unix timestamp
  dateKey: string         // YYYY-MM-DD (local time)
  important: boolean      // Star flag
  myDay: boolean          // In My Day list
  dueDate: string | null  // YYYY-MM-DD or null
  steps: TaskStep[]       // Subtasks
  notes: string           // Additional notes
  listId: string          // Parent list ID
}

interface TaskStep {
  id: string
  title: string
  completed: boolean
}
```

### RecurringTask
```typescript
interface RecurringTask {
  id: string
  text: string
  weekdays: number[]  // 0=Sun, 1=Mon, ..., 6=Sat
}
```

### TimerState
```typescript
interface TimerState {
  startTime: number | null
  pausedAt: number | null
  totalPausedTime: number  // Cumulative ms
  isPaused: boolean
  dateKey: string | null   // Day this timer belongs to
}
```

### PauseLog
```typescript
interface PauseLog {
  id: string
  reason: PauseReason  // "Lunch" | "AM Break" | "PM Break" | "Appointment" | "Meeting" | "Phone Call"
  startTime: number
  endTime: number | null
  duration: number     // ms
  dateKey: string
}
```

### TaskList (Custom Lists)
```typescript
interface TaskList {
  id: string
  name: string
  color?: string
  icon?: string
}
```

## localStorage Keys

| Key | Contents |
|-----|----------|
| `signal-over-noise-todos` | Todo[] |
| `signal-over-noise-timer` | TimerState |
| `signal-over-noise-recurring` | RecurringTask[] |
| `signal-over-noise-pause-log` | PauseLog[] |
| `signal-over-noise-recurring-added` | string[] (dateKeys, last 7 days) |
| `signal-over-noise-custom-lists` | TaskList[] |
| `signal-over-noise-sync-state` | LocalSyncState |

## Sync System

### Authentication Flow
1. **Setup**: User enters 4-digit PIN → System generates `SIGNAL-XXXXXX` code
2. **Login**: User enters sync code + PIN → Gets auth token
3. **Sync**: Data synced to Vercel Blob with auth headers

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync/setup` | POST | Create new sync account |
| `/api/sync/login` | POST | Login and fetch data |
| `/api/sync` | GET | Fetch synced data (auth required) |
| `/api/sync` | POST | Update synced data (auth required) |

### Security Features
- PIN hashed with SHA-256 + per-user salt
- Auth token derived from syncCode + salt (not PIN)
- Constant-time comparison (prevents timing attacks)
- Unique sync code collision detection (10 retries)
- Auth required on both GET and POST endpoints
- Exponential backoff on failures (1s, 2s, 4s, max 3 retries)

## Commands

```bash
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Environment Variables

```bash
# .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...  # Vercel Blob storage token
```

## Configuration Files

### tailwind.config.ts
Standard Tailwind v4 config with content paths.

### globals.css
Uses `@theme` block for CSS variables:
- Light: `hsl(0 0% 98%)` background
- Dark: `hsl(0 0% 7%)` background
- Monochrome accent (foreground = accent)

### manifest.json (PWA)
- Name: "Signal Over Noise"
- Short name: "Signal"
- Display: standalone
- Theme: #1f1f1f

## Key Implementation Notes

1. **Hydration Safety**: ThemeToggle and sidebar render placeholders until client mount
2. **Mobile UX**: Sidebar auto-collapses, delete buttons always visible
3. **Timer**: Resets daily, persists across page refreshes
4. **Data Migration**: `migrateTodo()` adds missing fields to legacy data
5. **Sync Debouncing**: 1-second debounce prevents API spam
6. **Search**: Full-text across task titles and notes (null-safe)
7. **Task Counts**: Pre-computed in single pass with memoization
8. **Accessibility**: ARIA labels, keyboard navigation, focus management

## ms-todo-clone.jsx

Standalone React prototype (~807 lines) at project root. **Not integrated into the app** - serves as UI reference for MS To-Do design patterns. Uses in-memory state with hardcoded sample data.

## Development History

### Session 1 (2026-01-23): Initial Build
- Next.js 16 + TypeScript + Tailwind v4 setup
- Cloned from v0-to-do-list-pwa.vercel.app
- Added timer, progress tracking, Signal Manifesto
- Hydration fixes, accessibility improvements

### Session 2 (2026-01-23): Polish & Deploy
- CSS refinements for dark mode
- Deployed to GitHub

### Session 3 (2026-01-26): MS To-Do UI & Sync
- MS To-Do style sidebar and task detail panel
- Vercel Blob sync with PIN authentication
- Security fixes: auth on GET, constant-time comparison
- Data migration for backward compatibility
- Sync retry logic with exponential backoff

## Smart Lists Logic

| List | Filter Criteria |
|------|----------------|
| My Day | `myDay === true` OR `dateKey === today` |
| Important | `important === true` |
| Planned | `dueDate !== null` |
| Tasks | Default list (`listId === 'tasks'`) |
| Custom | `listId === customList.id` |
