# Signal Over Noise

A productivity PWA built on the Pareto principle: focus on the 20% that drives 80% of your progress. Features an MS To-Do inspired interface with multi-device sync.

## Deployment

- **Live**: https://v0-to-do-list-iyi9fax2m-rich-blanchards-projects.vercel.app
- **GitHub**: https://github.com/RICHHOMELOANS/v0-to-do-list-pwa

## Project Overview

This is a Next.js 16 application originally cloned from v0-to-do-list-pwa.vercel.app, now enhanced with:
- MS To-Do style UI with collapsible sidebar and task detail panel
- Multi-device sync via Vercel Blob storage with PIN authentication
- 14-hour countdown timer with pause/resume functionality
- Recurring tasks with weekday scheduling
- Smart lists (My Day, Important, Planned, Tasks)
- Custom lists support

**Key Philosophy**: "Amplify the Signal. Mute the Noise. Own the Mission."

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss`
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React
- **State**: React hooks with localStorage persistence + Vercel Blob sync
- **Storage**: Vercel Blob for cloud sync

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── sync/
│   │       ├── route.ts       # GET/POST sync data
│   │       ├── setup/route.ts # Create new sync account
│   │       └── login/route.ts # Login with sync code + PIN
│   ├── globals.css            # Tailwind v4 theme variables
│   ├── layout.tsx             # Root layout with ThemeProvider
│   ├── page.tsx               # Home page (renders TodoList)
│   ├── icon.tsx               # Dynamic favicon
│   └── apple-icon.tsx         # Apple touch icon
├── components/
│   ├── sidebar.tsx            # Collapsible sidebar with smart/custom lists
│   ├── sync-modal.tsx         # Sync setup/login modal + SyncButton
│   ├── task-detail-panel.tsx  # Right panel for task editing
│   ├── theme-provider.tsx     # next-themes wrapper
│   └── todo-list.tsx          # Main app component (~1500 lines)
└── lib/
    ├── sync.ts                # Sync utilities, auth token generation
    └── utils.ts               # cn() utility for class merging
```

## Core Components

### todo-list.tsx
| Component | Purpose |
|-----------|---------|
| `TodoList` | Main orchestrator component with all state management |
| `ThemeToggle` | Dark/light mode switch with hydration-safe rendering |
| `TimerCard` | 14-hour countdown with pause/resume/reset |
| `ProgressCard` | Task completion percentage with progress bar |
| `TaskForm` | Input for adding new tasks |
| `TaskItem` | Individual task with toggle/delete/important (React.memo) |
| `TaskList` | Renders list of TaskItems |
| `RecurringTaskItem` | Recurring task with weekday toggles |
| `PauseModal` | Modal for selecting pause reason |
| `Manifesto` | Static "Signal Manifesto" content |

### sidebar.tsx
- Collapsible sidebar with hamburger toggle
- Smart lists: My Day, Important, Planned, Tasks
- Custom lists with add/delete functionality
- Search input for filtering tasks
- Task count badges

### task-detail-panel.tsx
- Slide-out panel for task details
- Steps (subtasks) with add/toggle/delete
- Due date picker
- Notes textarea
- My Day and Important toggles
- Delete task button

### sync-modal.tsx
- Setup new sync (create PIN, get sync code)
- Connect existing sync (enter code + PIN)
- SyncButton component with status indicators

## Custom Hooks

- `useLocalStorage<T>` - Type-safe localStorage with error handling and loaded state
- `usePausableTimer` - Manages countdown timer with pause support

## Data Structures

### Todo Interface
```typescript
interface Todo {
  id: string           // crypto.randomUUID()
  text: string         // Task description
  completed: boolean
  createdAt: number    // Unix timestamp
  dateKey: string      // YYYY-MM-DD for day tracking
  important: boolean   // Star/important flag
  myDay: boolean       // Added to My Day
  dueDate: string | null  // YYYY-MM-DD or null
  steps: TaskStep[]    // Subtasks
  notes: string        // Additional notes
  listId: string       // Which list it belongs to
}
```

### RecurringTask Interface
```typescript
interface RecurringTask {
  id: string
  text: string
  weekdays: number[]   // 0=Sun, 1=Mon, ..., 6=Sat
}
```

### TimerState Interface
```typescript
interface TimerState {
  startTime: number | null
  pausedAt: number | null
  totalPausedTime: number
  isPaused: boolean
  dateKey: string | null
}
```

## localStorage Keys

- `signal-over-noise-todos` - Array of Todo objects
- `signal-over-noise-timer` - TimerState object
- `signal-over-noise-recurring` - Array of RecurringTask objects
- `signal-over-noise-pause-log` - Array of PauseLog objects
- `signal-over-noise-recurring-added` - Array of dateKeys (last 7 days)
- `signal-over-noise-custom-lists` - Array of custom TaskList objects
- `signal-sync-state` - Sync credentials (syncCode, authToken, lastSyncedAt)

## Sync System

### Authentication Flow
1. **Setup**: User enters 4-digit PIN -> System generates `SIGNAL-XXXXXX` code
2. **Login**: User enters sync code + PIN -> Gets auth token
3. **Sync**: Data synced to Vercel Blob with auth token in headers

### API Endpoints
- `POST /api/sync/setup` - Create new sync account
- `POST /api/sync/login` - Login and fetch data
- `GET /api/sync` - Fetch synced data (requires auth)
- `POST /api/sync` - Update synced data (requires auth)

### Security
- PIN hashed with SHA-256 + salt
- Auth token generated from PIN + sync code + salt
- Constant-time comparison for timing attack prevention
- Exponential backoff retry on sync failures

## Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Configuration

### Environment Variables (.env.local)
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...  # Vercel Blob storage token
```

### Tailwind v4 (globals.css)
Uses `@theme` block for CSS variables. Key colors:
- Light: `hsl(0 0% 98%)` background
- Dark: `hsl(0 0% 7%)` background
- Accent matches foreground for monochrome design

### PWA (public/manifest.json)
- Name: "Signal Over Noise"
- Short name: "Signal"
- Display: standalone
- Theme: #1f1f1f (dark)

## Important Notes

1. **Hydration Safety**: ThemeToggle and sidebar render placeholders until mounted
2. **Mobile UX**: Sidebar collapses on mobile, delete buttons always visible
3. **Timer Persistence**: Stored in localStorage, resets daily
4. **Data Migration**: `migrateTodo()` ensures old todos get new fields with defaults
5. **Sync Debouncing**: 1 second debounce on sync to prevent excessive API calls
6. **Retry Logic**: Exponential backoff (1s, 2s, 4s) on sync failures, max 3 retries
7. **Task Counts**: Pre-computed in single pass for performance
8. **Accessibility**: ARIA labels on all interactive elements, keyboard navigable

## Recent Changes (Jan 2026)

- Added MS To-Do style UI with sidebar and task detail panel
- Implemented Vercel Blob sync with PIN authentication
- Added security fixes: auth on GET endpoint, constant-time comparison
- Added data migration for backward compatibility
- Fixed search crash on undefined notes/steps
- Optimized task count filtering with memoization
- Added sync error state with retry logic and UI feedback
