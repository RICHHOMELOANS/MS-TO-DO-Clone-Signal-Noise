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
   - Pushed to https://github.com/RICHHOMELOANS/Signal-over-noise
   - Initial commit: `8f95ea6`

### Files Modified

- `src/app/globals.css` - Enhanced theme variables, focus styles, typography
- `src/app/layout.tsx` - Simplified icon config
- `src/app/page.tsx` - Simplified to single component render
- `docs/session-notes.md` - Updated with session history

### Repository

- **URL**: https://github.com/RICHHOMELOANS/Signal-over-noise
- **Branch**: main
