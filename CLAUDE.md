# Signal Over Noise

A productivity PWA built on the Pareto principle: focus on the 20% that drives 80% of your progress.

## Deployment

- **Live**: https://v0-to-do-list-iyi9fax2m-rich-blanchards-projects.vercel.app
- **GitHub**: https://github.com/RICHHOMELOANS/v0-to-do-list-pwa

## Project Overview

This is a Next.js 16 application cloned from [v0-to-do-list-pwa.vercel.app](https://v0-to-do-list-pwa.vercel.app/). It features a 14-hour countdown timer that starts when you add your first task, encouraging intense focus cycles.

**Key Philosophy**: "Amplify the Signal. Mute the Noise. Own the Mission."

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss`
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React
- **State**: React hooks with localStorage persistence

## Architecture

```
src/
├── app/
│   ├── globals.css       # Tailwind v4 theme variables
│   ├── layout.tsx        # Root layout with ThemeProvider
│   ├── page.tsx          # Home page (renders TodoList)
│   ├── icon.tsx          # Dynamic favicon
│   └── apple-icon.tsx    # Apple touch icon
├── components/
│   ├── theme-provider.tsx  # next-themes wrapper
│   └── todo-list.tsx       # Main app component (500+ lines)
└── lib/
    └── utils.ts            # cn() utility for class merging
```

## Core Components (in todo-list.tsx)

| Component | Purpose |
|-----------|---------|
| `ThemeToggle` | Dark/light mode switch with hydration-safe rendering |
| `TimerCard` | 14-hour countdown with reset functionality |
| `ProgressCard` | Task completion percentage with progress bar |
| `TaskForm` | Input for adding new tasks |
| `TaskItem` | Individual task with toggle/delete (React.memo) |
| `TaskList` | Renders list of TaskItems |
| `Manifesto` | Static "Signal Manifesto" content |

## Custom Hooks

- `useLocalStorage<T>` - Type-safe localStorage with error handling
- `useTimer` - Manages countdown timer state

## Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Configuration

### Tailwind v4 (globals.css)
Uses `@theme` block for CSS variables. Key colors:
- Light: `hsl(0 0% 98%)` background
- Dark: `hsl(0 0% 7%)` background
- Accent matches foreground for monochrome design

### PostCSS (postcss.config.mjs)
```js
plugins: { "@tailwindcss/postcss": {} }
```

### PWA (public/manifest.json)
- Name: "Signal Over Noise"
- Short name: "Signal"
- Display: standalone
- Theme: #1f1f1f (dark)

## Important Notes

1. **Hydration Safety**: ThemeToggle renders placeholder until mounted to prevent mismatch
2. **Mobile UX**: Delete button visible on mobile (opacity-60), hover-only on desktop
3. **Timer Persistence**: Stored in localStorage, survives page refresh
4. **No External State**: All state in React hooks + localStorage, no backend
5. **Accessibility**: ARIA labels on all interactive elements, keyboard navigable

## localStorage Keys

- `signal-over-noise-todos` - Array of Todo objects
- `signal-over-noise-timer` - Unix timestamp of timer start

## Todo Interface

```typescript
interface Todo {
  id: string        // crypto.randomUUID()
  text: string      // Task description
  completed: boolean
  createdAt: number // Unix timestamp
}
```
