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
| Linting | ESLint 9 (flat config) |

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
│   │   ├── todo-list.tsx         # Main app component (~1200 lines)
│   │   ├── sidebar.tsx           # Bucket-grouped sidebar (~280 lines)
│   │   ├── task-detail-panel.tsx # Task editing panel (~470 lines)
│   │   ├── sync-modal.tsx        # Sync dialogs (~416 lines)
│   │   └── theme-provider.tsx    # next-themes wrapper (12 lines)
│   └── lib/
│       ├── data-seed.ts          # Seed data with buckets & todos (~330 lines)
│       ├── sync.ts               # Auth utilities & types (~130 lines)
│       └── utils.ts              # cn() class merging utility
├── docs/
│   └── session-notes.md          # Development history
├── public/
│   └── manifest.json             # PWA manifest
├── .claude/
│   └── hooks.json                # Claude Code hooks (Stop event for docs)
├── Merge/                        # Merge installation files
│   └── install-merge.ps1         # PowerShell installer script
├── eslint.config.mjs             # ESLint 9 flat config
├── ms-todo-clone.jsx             # Standalone MS To-Do prototype (~807 lines)
└── .env.local                    # BLOB_READ_WRITE_TOKEN
```

## Core Components

### todo-list.tsx (Main Application)

**State Management:**
- `todos` - Task array (localStorage persisted)
- `buckets` - Top-level bucket groupings (localStorage persisted)
- `bucketGroups` - Lists within buckets (localStorage persisted)
- `timerState` - 14-hour countdown with pause tracking
- `recurringTasks` - Auto-add tasks on specific weekdays
- `pauseLogs` - Pause events with reasons and timestamps
- `customLists` - User-created task lists
- `syncState` - Multi-device sync credentials
- `showCompleted` - Toggle completed tasks visibility

**Sub-Components:**
| Component | Purpose |
|-----------|---------|
| `TodoList` | Main orchestrator with all state |
| `ThemeToggle` | Dark/light mode (hydration-safe) |
| `TimerCard` | 14-hour countdown with pause/resume |
| `ProgressCard` | Task completion percentage |
| `EnhancedTaskForm` | Task input with list picker, due date, reminder, recurring |
| `TaskItem` | Individual task (React.memo optimized) |
| `TaskList` | Task container |
| `RecurringTaskItem` | Task with weekday toggles |
| `PauseModal` | Pause reason selector |
| `Manifesto` | Signal philosophy display |

### sidebar.tsx
- Collapsible sidebar (hamburger toggle)
- **Bucket-grouped organization** with collapsible sections
- Smart lists: My Day, Important, Planned, Tasks
- Custom lists with add/delete
- Search input with task filtering
- Unfinished task count badges per bucket and list

### task-detail-panel.tsx
- Slide-out panel for task editing
- Steps (subtasks) with toggle/delete
- Due date picker with overdue highlighting
- **Reminder picker** (Later today, Tomorrow morning, etc.)
- **Recurring task picker** (Daily, Weekdays, Weekly, Monthly, Yearly)
- **Link field** with external URL support
- **File/Note indicators** (badges for hasFiles, hasNote)
- Notes textarea
- My Day and Important toggles
- Task deletion

### data-seed.ts (NEW)
- First-launch seed data system
- **5 Buckets**: 2103, PERSONAL, RHL, RICH RE, REVENTE
- **17 Bucket Groups**: Cleaning, Tasks, Inventory, etc.
- **~60 Sample Tasks** with subtasks, due dates, links
- Helper functions: `parseDueLabel()`, `toSteps()`, `buildTodos()`

### sync-modal.tsx
- Setup mode: Create PIN, get sync code
- Login mode: Enter code + PIN
- Status indicators and error handling
- SyncButton component

## Data Structures

### Todo (Extended)
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
  // Extended fields (v2)
  bucketId?: string       // Parent bucket ID
  starred?: boolean       // Alias for important
  link?: string | null    // External URL
  hasFiles?: boolean      // Attachment indicator
  hasNote?: boolean       // Note indicator
  recurring?: string | null  // "daily" | "weekdays" | "weekly" | "monthly" | "yearly"
  reminder?: string | null   // "Later today" | "Tomorrow morning" | etc.
}

interface TaskStep {
  id: string
  title: string
  completed: boolean
}
```

### Bucket & BucketGroup (NEW)
```typescript
interface Bucket {
  id: string
  name: string
  icon: string        // Emoji
  accent: string      // Hex color
  groupOrder: string[] // List IDs in order
}

interface BucketGroup {
  id: string
  name: string
  icon: string
  color: string
  bucketId: string    // Parent bucket ID
}

interface SeedTodo {
  // Same as Todo, plus:
  dueLabel: string | null  // Human-readable due date
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
| `signal-over-noise-buckets` | Bucket[] |
| `signal-over-noise-bucket-groups` | BucketGroup[] |
| `signal-over-noise-seeded` | boolean (first-launch flag) |

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

### eslint.config.mjs (ESLint 9)
```javascript
// Simplified flat config using typescript-eslint
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**"] },
)
```

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
9. **Seed Data**: Auto-loads on first launch when localStorage is empty
10. **Performance**: React.memo on TaskItem, useCallback/useMemo throughout

## Seed Data (Default Buckets)

| Bucket | Icon | Groups |
|--------|------|--------|
| 2103 | 🏠 | Cleaning, Some Day, Lumber, Measurements, Neighbors, Research, Services, Supplies, Tasks, Tools |
| PERSONAL | 👤 | Tasks, Important, Hot Yoga Guide |
| RHL | 🏢 | RHL ET AL |
| RICH RE | 🏘️ | Tasks |
| REVENTE | 💰 | Inventory, Completed |

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

### Session 4 (2026-01-31): Master-Todo Merge
- **Bucket-grouped organization**: 5 buckets with 17 groups
- **Extended Todo interface**: bucketId, starred, link, hasFiles, hasNote, recurring, reminder
- **EnhancedTaskForm**: Target list picker, due date, reminder, recurring options
- **Task detail panel**: Link editor, reminder/recurring pickers, file/note indicators
- **Seed data system**: Auto-loads ~60 sample tasks on first launch
- **Collapsible completed tasks**: Toggle visibility of completed items
- **ESLint 9 migration**: Flat config format with FlatCompat
- **Code review fixes**: Accessibility improvements, type safety, bug fixes

## Smart Lists Logic

| List | Filter Criteria |
|------|----------------|
| My Day | `myDay === true` OR `dateKey === today` |
| Important | `important === true` OR `starred === true` |
| Planned | `dueDate !== null` |
| Tasks | Default list (`listId === 'tasks'`) |
| Custom | `listId === customList.id` |
| Bucket Group | `listId === bucketGroup.id` |
