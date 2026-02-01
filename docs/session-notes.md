# Session Notes

Development history for Signal Over Noise project.

---

## 2026-01-23 - Initial Build & Code Review

### Work Completed

1. **Project Setup**
   - Initialized Next.js 16 with TypeScript and Tailwind v4
   - Configured PostCSS with `@tailwindcss/postcss` plugin
   - Set up next-themes for dark/light mode support

2. **Cloned Original App**
   - Fetched and analyzed https://v0-to-do-list-pwa.vercel.app/
   - Recreated all UI components to match original design
   - Implemented 14-hour countdown timer
   - Added progress tracking card
   - Included "The Signal Manifesto" section

3. **Senior Engineer Code Review & Fixes**
   - Fixed hydration mismatch in ThemeToggle (use `resolvedTheme`, render placeholder on SSR)
   - Added timer reset functionality with RotateCcw button
   - Fixed mobile UX for delete button (visible on touch, hover on desktop)
   - Split monolithic 300-line component into 7 focused sub-components
   - Added comprehensive accessibility (aria-labels, roles, keyboard nav)
   - Created custom hooks: `useLocalStorage<T>`, `useTimer`
   - Wrapped handlers in `useCallback`, memoized `TaskItem` with `React.memo`
   - Added try/catch error handling around all localStorage operations
   - Removed unused shadcn/ui components (Button, Input, Card, etc.)

### Key Decisions

- **No backend**: All state persisted to localStorage
- **Monochrome design**: Accent color matches foreground for minimal aesthetic
- **Component colocation**: All sub-components in single todo-list.tsx file (well-organized with section dividers)
- **Tailwind v4**: Using new `@theme` block syntax instead of tailwind.config.js

### Files Created/Modified

**Created:**
- `src/app/layout.tsx` - Root layout
- `src/app/page.tsx` - Home page
- `src/app/globals.css` - Tailwind v4 theme
- `src/app/icon.tsx` - Dynamic favicon
- `src/app/apple-icon.tsx` - Apple touch icon
- `src/components/todo-list.tsx` - Main app (502 lines)
- `src/components/theme-provider.tsx` - next-themes wrapper
- `src/lib/utils.ts` - cn() utility
- `public/manifest.json` - PWA manifest
- `public/icon.svg` - SVG favicon
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `postcss.config.mjs` - PostCSS config
- `.claude/hooks.json` - Session documentation hook
- `CLAUDE.md` - Project context
- `docs/session-notes.md` - This file

**Removed:**
- `src/components/ui/*` - Unused shadcn components
- `src/components/theme-toggle.tsx` - Moved into todo-list.tsx

### Issues Encountered

1. **Tailwind v4 breaking change**: PostCSS plugin moved to `@tailwindcss/postcss`
2. **Directory naming**: npm rejected spaces in folder name, worked around by creating package.json first
3. **Icon 404s**: Created SVG icon instead of PNG to avoid binary file issues

### Next Steps

- [ ] Add drag-to-reorder for tasks
- [ ] Add task categories/tags
- [ ] Add sound/notification when timer expires
- [ ] Consider adding data export/import
- [ ] Add unit tests with Vitest
- [ ] Deploy to Vercel

---

## 2026-01-23 - Polish & GitHub Push (continued)

### Work Completed

1. **CSS Refinements**
   - Darkened dark mode background (`hsl(0 0% 7%)`) for better contrast
   - Added `--font-sans` CSS variable for consistent typography
   - Added global focus ring styles (`*:focus-visible`)
   - Added `.tabular-nums` utility class for timer
   - Improved antialiasing with `-webkit-font-smoothing` and `-moz-osx-font-smoothing`

2. **Layout Simplification**
   - Simplified `page.tsx` to just render `<TodoList />`
   - Simplified icon config to use single `/icon.svg`
   - Removed redundant apple-icon references

3. **GitHub Repository**
   - Pushed to https://github.com/RICHHOMELOANS/v0-to-do-list-pwa
   - Initial commit: `8f95ea6`

### Files Modified

- `src/app/globals.css` - Enhanced theme variables, focus styles, typography
- `src/app/layout.tsx` - Simplified icon config
- `src/app/page.tsx` - Simplified to single component render
- `docs/session-notes.md` - Updated with session history

### Repository

- **GitHub**: https://github.com/RICHHOMELOANS/v0-to-do-list-pwa
- **Branch**: main

---

## 2026-01-26 - MS To-Do UI & Security Audit Fixes

### Work Completed

1. **MS To-Do Style UI Implementation**
   - Added collapsible sidebar with smart lists (My Day, Important, Planned, Tasks)
   - Added custom lists support with add/delete functionality
   - Added task detail panel with steps, notes, due date, My Day toggle
   - Added search functionality across all tasks
   - Created `sidebar.tsx` and `task-detail-panel.tsx` components

2. **Vercel Blob Sync System**
   - Implemented multi-device sync using Vercel Blob storage
   - PIN-based authentication with SHA-256 hashing
   - Setup flow: user creates 4-digit PIN, gets SIGNAL-XXXXXX code
   - Login flow: enter sync code + PIN to sync across devices
   - Created `sync-modal.tsx` with setup/login modals
   - Created API routes: `/api/sync`, `/api/sync/setup`, `/api/sync/login`

3. **Security Audit & Fixes**
   - Added authentication to GET `/api/sync` endpoint (was missing auth)
   - Implemented constant-time comparison for timing attack prevention
   - Added data migration helper `migrateTodo()` for backward compatibility
   - Fixed search crash on undefined notes/steps with null-safe checks
   - Fixed selectedTask callback dependency churn (use ID instead of object)
   - Added sync error state with UI feedback (red indicator)
   - Added sync retry logic with exponential backoff (1s, 2s, 4s, max 3 retries)
   - Optimized task count filtering with pre-computed memoization

4. **Enhanced Todo Interface**
   - Added fields: `important`, `myDay`, `dueDate`, `steps`, `notes`, `listId`
   - Added `dateKey` for daily tracking
   - Added `TaskStep` interface for subtasks

5. **Documentation Updates**
   - Updated `CLAUDE.md` with comprehensive project context
   - Updated `docs/session-notes.md` with session history
   - `.claude/hooks.json` already existed for Stop event

### Key Decisions

- **Vercel Blob over Postgres**: Simpler setup, no schema management, JSON storage
- **PIN-based auth**: Simple 4-digit PIN + generated sync code for cross-device
- **Optimistic updates**: Write to localStorage immediately, debounce API sync (1s)
- **Last-write-wins**: Simple conflict resolution strategy
- **Data migration**: Auto-migrate old todos to new schema with defaults

### Files Created/Modified

**Created:**
- `src/components/sidebar.tsx` - Collapsible sidebar component
- `src/components/task-detail-panel.tsx` - Task editing panel
- `src/components/sync-modal.tsx` - Sync setup/login UI
- `src/lib/sync.ts` - Sync utilities, auth token generation
- `src/app/api/sync/route.ts` - GET/POST sync data
- `src/app/api/sync/setup/route.ts` - Create sync account
- `src/app/api/sync/login/route.ts` - Login with code + PIN
- `.env.local` - Vercel Blob token

**Modified:**
- `src/components/todo-list.tsx` - Major rewrite (~1500 lines now)
  - Added sidebar integration
  - Added task detail panel
  - Added sync state management
  - Added retry logic
  - Added data migration
  - Optimized task counts
- `CLAUDE.md` - Comprehensive update with new architecture
- `docs/session-notes.md` - Added this session

### Issues Encountered

1. **Dev server stuck compiling**: Multiple zombie node.exe processes, fixed with `taskkill` and removing `.next` folder
2. **Lock file issues**: Needed to clean up `.next/dev/lock` after crashes
3. **Missing .env.local**: User couldn't sync without BLOB_READ_WRITE_TOKEN
4. **Page not loading**: Compilation stuck, resolved by cleaning cache and restarting

### Security Improvements

- GET endpoint now requires auth token (was publicly readable before)
- Constant-time string comparison prevents timing attacks
- Salt stored per-user for PIN hashing
- Auth token derived from PIN + sync code + salt
- Retry with exponential backoff prevents hammering on failures

### Next Steps

- [ ] Test sync across multiple devices
- [ ] Add offline queue for sync when reconnecting
- [ ] Add last-modified timestamps for better conflict resolution
- [ ] Consider WebSocket for real-time sync
- [ ] Add data export/import functionality
- [ ] Deploy updated version to Vercel

---

## 2026-01-27 - Sync Deployment Fix & Documentation

### Work Completed

1. **CLAUDE.md Overhaul**
   - Rewrote documentation with comprehensive project context
   - Added tech stack table with all dependencies
   - Added full project structure with line counts
   - Documented all data structures (Todo, TaskStep, RecurringTask, TimerState, PauseLog, TaskList)
   - Added localStorage keys reference table
   - Documented sync API endpoints and security features
   - Added smart lists filter logic table
   - Explained `ms-todo-clone.jsx` purpose (standalone prototype)

2. **Diagnosed Sync Issue on Production**
   - User reported "Sync code not found" error on https://v0-to-do-list-pwa.vercel.app/
   - Investigated codebase - sync code on `main` branch matched `RHL-To-Do`
   - Root cause: `BLOB_READ_WRITE_TOKEN` environment variable not exposed to the app
   - Vercel Blob store was connected but variable wasn't accessible to runtime

3. **Resolution**
   - User confirmed Blob store connected in Vercel dashboard
   - Verified token matched local `.env.local`
   - Redeployed app to pick up environment variable
   - Sync now working - successfully generated new `SIGNAL-XXXXXX` code

### Key Findings

- **Data Loss**: User's data from previous day was lost
  - localStorage was cleared (browser data wipe)
  - Sync wasn't working at the time, so no cloud backup existed
  - No recovery possible

- **Deployment Gotcha**: Connecting Vercel Blob store doesn't automatically expose the token
  - Must verify environment variable is named exactly `BLOB_READ_WRITE_TOKEN`
  - Must redeploy after adding/changing environment variables

### Files Modified

- `CLAUDE.md` - Complete rewrite with comprehensive documentation
- `docs/session-notes.md` - Added this session

### Lessons Learned

1. Always verify environment variables are properly configured in production before relying on sync
2. Save sync code + PIN in a password manager immediately after setup
3. Consider adding a "sync status" indicator that warns when sync has never succeeded

### Next Steps

- [ ] Add sync health check on app load (verify token works)
- [ ] Add warning if sync has never completed successfully
- [ ] Consider local backup export feature as failsafe

---

## 2026-01-31 - Repository Migration

### Work Completed

1. **Created New Repository**
   - Migrated from branch on `v0-to-do-list-pwa` to dedicated repo
   - New repo: https://github.com/RICHHOMELOANS/MS-TO-DO-Clone-Signal-Noise
   - Pushed `RHL-To-Do` branch as `main` to new repo

2. **Cleaned Up Old Repository**
   - Deleted `RHL-To-Do` branch from `v0-to-do-list-pwa`
   - Old repo remains clean with only original code

3. **Updated Documentation**
   - Updated `CLAUDE.md` with new repo URL
   - Updated `docs/session-notes.md` with migration notes

### Repository Structure

- **New Repo**: https://github.com/RICHHOMELOANS/MS-TO-DO-Clone-Signal-Noise (this project)
- **Old Repo**: https://github.com/RICHHOMELOANS/v0-to-do-list-pwa (original simple todo app)

### Next Steps

- [ ] Deploy new repo to Vercel
- [ ] Configure Vercel Blob storage for new deployment
- [ ] Set up BLOB_READ_WRITE_TOKEN environment variable
