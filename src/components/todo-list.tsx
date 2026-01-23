"use client"

import * as React from "react"
import { Plus, Moon, Sun, Trash2, Check, RotateCcw } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "signal-over-noise-todos"
const TIMER_KEY = "signal-over-noise-timer"
const FOURTEEN_HOURS_MS = 14 * 60 * 60 * 1000

// =============================================================================
// Custom Hooks
// =============================================================================

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(initialValue)
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    try {
      const item = localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
    setIsInitialized(true)
  }, [key])

  const setValue = React.useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        localStorage.setItem(key, JSON.stringify(valueToStore))
        return valueToStore
      })
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  return [storedValue, setValue]
}

function useTimer(startTime: number | null) {
  const [timeRemaining, setTimeRemaining] = React.useState(FOURTEEN_HOURS_MS)

  React.useEffect(() => {
    if (!startTime) {
      setTimeRemaining(FOURTEEN_HOURS_MS)
      return
    }

    // Calculate immediately on mount
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, FOURTEEN_HOURS_MS - elapsed)
    setTimeRemaining(remaining)

    if (remaining <= 0) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, FOURTEEN_HOURS_MS - elapsed)
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return timeRemaining
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// =============================================================================
// Sub-Components
// =============================================================================

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Prevent hydration mismatch by showing consistent icon until mounted
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center justify-center rounded-md size-9 absolute right-0 top-0 text-muted-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <span className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-md size-9 absolute right-0 top-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}

interface TimerCardProps {
  timeRemaining: number
  isRunning: boolean
  onReset: () => void
}

function TimerCard({ timeRemaining, isRunning, onReset }: TimerCardProps) {
  const isExpired = timeRemaining <= 0 && isRunning

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Time Remaining
        </span>
        {isRunning && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
      <div
        className={cn(
          "text-4xl md:text-5xl font-mono font-bold tracking-tight text-center tabular-nums",
          isExpired ? "text-destructive" : "text-foreground"
        )}
      >
        {formatTime(timeRemaining)}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        {isExpired
          ? "Time's up! Reset to start a new cycle"
          : isRunning
          ? "Focus on your signal tasks"
          : "Timer starts when you add your first task"}
      </p>
    </div>
  )
}

interface ProgressCardProps {
  completed: number
  total: number
}

function ProgressCard({ completed, total }: ProgressCardProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Progress
        </span>
        <span className="text-sm font-medium">
          {completed}/{total} tasks
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="text-center">
        <span className="text-3xl md:text-4xl font-bold text-accent">
          {percent}%
        </span>
        <span className="text-muted-foreground ml-2">complete</span>
      </div>
    </div>
  )
}

interface TaskFormProps {
  onAdd: (text: string) => void
}

function TaskForm({ onAdd }: TaskFormProps) {
  const [text, setText] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    onAdd(trimmed)
    setText("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1 bg-card border border-border h-12 px-4 rounded-md text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
        aria-label="New task"
      />
      <button
        type="submit"
        className="h-12 w-12 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md inline-flex items-center justify-center transition-colors"
        aria-label="Add task"
      >
        <Plus className="w-5 h-5" />
      </button>
    </form>
  )
}

interface TaskItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const TaskItem = React.memo(function TaskItem({ todo, onToggle, onDelete }: TaskItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-all",
        todo.completed && "opacity-60"
      )}
    >
      <button
        onClick={() => onToggle(todo.id)}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
          todo.completed
            ? "bg-accent border-accent text-accent-foreground"
            : "border-muted-foreground/30 hover:border-accent"
        )}
        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        aria-pressed={todo.completed}
      >
        {todo.completed && <Check className="w-4 h-4" />}
      </button>
      <span
        className={cn(
          "flex-1 text-sm break-words",
          todo.completed && "line-through text-muted-foreground"
        )}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 shrink-0"
        aria-label={`Delete task: ${todo.text}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
})

interface TaskListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function TaskList({ todos, onToggle, onDelete }: TaskListProps) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-1">No tasks yet</p>
        <p className="text-sm">Add your signal tasks to start the 14-hour countdown</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="list" aria-label="Task list">
      {todos.map((todo) => (
        <TaskItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function Manifesto() {
  return (
    <section className="border-t border-border pt-10 mt-10 space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-center">
        The Signal Manifesto
      </h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-2">
            The Mission
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed">
            To ruthlessly eliminate the noise of modern distraction and amplify the critical
            work that defines your legacy. Inspired by intense focus cycles, we believe that
            progress isn't born from long hours, but from the brutal prioritization of the
            Signal—the mission-critical tasks that drive 80% of your impact.
          </p>
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-2">
            The Statement
          </h3>
          <blockquote className="text-base font-medium text-accent italic border-l-2 border-accent pl-4">
            "Amplify the Signal. Mute the Noise. Own the Mission."
          </blockquote>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          We provide the framework to identify your non-negotiables, commit to 14-hour cycles
          of intense focus, and maintain a 4:1 signal-to-noise ratio. By saying no to the
          thousand distractions, we ensure you have the time required to put a dent in the universe.
        </p>
      </div>
    </section>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function TodoList() {
  const [todos, setTodos] = useLocalStorage<Todo[]>(STORAGE_KEY, [])
  const [timerStart, setTimerStart] = React.useState<number | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const timeRemaining = useTimer(timerStart)

  // Load timer from localStorage
  React.useEffect(() => {
    setMounted(true)
    try {
      const storedTimer = localStorage.getItem(TIMER_KEY)
      if (storedTimer) {
        const start = parseInt(storedTimer, 10)
        if (!isNaN(start)) {
          setTimerStart(start)
        }
      }
    } catch (error) {
      console.warn("Error reading timer from localStorage:", error)
    }
  }, [])

  const addTodo = React.useCallback((text: string) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    }

    setTodos((prev) => {
      // Start timer on first task
      if (prev.length === 0 && !timerStart) {
        const now = Date.now()
        setTimerStart(now)
        localStorage.setItem(TIMER_KEY, now.toString())
      }
      return [...prev, todo]
    })
  }, [setTodos, timerStart])

  const toggleTodo = React.useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [setTodos])

  const deleteTodo = React.useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }, [setTodos])

  const resetTimer = React.useCallback(() => {
    const now = Date.now()
    setTimerStart(now)
    localStorage.setItem(TIMER_KEY, now.toString())
  }, [])

  const completedCount = todos.filter((t) => t.completed).length

  // Loading skeleton
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="h-20 animate-pulse bg-muted rounded-xl" />
          <div className="h-32 animate-pulse bg-muted rounded-xl" />
          <div className="h-32 animate-pulse bg-muted rounded-xl" />
          <div className="h-12 animate-pulse bg-muted rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-3 relative">
          <ThemeToggle />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance">
            Signal Over Noise.
          </h1>
          <p className="text-destructive text-sm text-pretty">
            Focus on the 20% that drives 80% of your progress. Mute everything else.
          </p>
        </header>

        <TimerCard
          timeRemaining={timeRemaining}
          isRunning={timerStart !== null}
          onReset={resetTimer}
        />

        <ProgressCard
          completed={completedCount}
          total={todos.length}
        />

        <TaskForm onAdd={addTodo} />

        <TaskList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />

        <Manifesto />

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
          <p>Add to home screen for the best experience</p>
        </footer>
      </div>
    </div>
  )
}
