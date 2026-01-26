"use client"

import * as React from "react"
import { Plus, Moon, Sun, Trash2, Check, RotateCcw, Pause, Play, ChevronDown, RefreshCw, Calendar } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { SyncModal, SyncButton } from "@/components/sync-modal"
import { getLocalSyncState, type LocalSyncState } from "@/lib/sync"

// =============================================================================
// Types
// =============================================================================

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  dateKey: string // YYYY-MM-DD format for day tracking (local time)
}

interface RecurringTask {
  id: string
  text: string
  weekdays: number[] // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

interface PauseLog {
  id: string
  reason: PauseReason
  startTime: number
  endTime: number | null
  duration: number // in ms
  dateKey: string // Track which day this pause belongs to
}

interface TimerState {
  startTime: number | null
  pausedAt: number | null
  totalPausedTime: number
  isPaused: boolean
  dateKey: string | null // Track which day this timer is for
}

type PauseReason = "Lunch" | "AM Break" | "PM Break" | "Appointment" | "Meeting" | "Phone Call"

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "signal-over-noise-todos"
const TIMER_KEY = "signal-over-noise-timer"
const RECURRING_KEY = "signal-over-noise-recurring"
const PAUSE_LOG_KEY = "signal-over-noise-pause-log"
const RECURRING_ADDED_KEY = "signal-over-noise-recurring-added"
const FOURTEEN_HOURS_MS = 14 * 60 * 60 * 1000
const MAX_PAUSE_LOGS = 100 // Prevent unbounded growth

const PAUSE_REASONS: PauseReason[] = [
  "Lunch",
  "AM Break",
  "PM Break",
  "Appointment",
  "Meeting",
  "Phone Call",
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

// =============================================================================
// Custom Hooks
// =============================================================================

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = React.useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const item = localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
    setIsLoaded(true)
  }, [key])

  const setValue = React.useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        localStorage.setItem(key, JSON.stringify(valueToStore))
        return valueToStore
      })
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`localStorage quota exceeded for key "${key}"`)
      } else {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    }
  }, [key])

  return [storedValue, setValue, isLoaded]
}

function usePausableTimer(timerState: TimerState, todayKey: string) {
  const [timeRemaining, setTimeRemaining] = React.useState(FOURTEEN_HOURS_MS)

  React.useEffect(() => {
    // Reset if timer is from a different day
    if (!timerState.startTime || timerState.dateKey !== todayKey) {
      setTimeRemaining(FOURTEEN_HOURS_MS)
      return
    }

    const calculateRemaining = () => {
      if (!timerState.startTime) return FOURTEEN_HOURS_MS

      const now = Date.now()
      let elapsed: number

      if (timerState.isPaused && timerState.pausedAt) {
        elapsed = timerState.pausedAt - timerState.startTime - timerState.totalPausedTime
      } else {
        elapsed = now - timerState.startTime - timerState.totalPausedTime
      }

      return Math.max(0, FOURTEEN_HOURS_MS - elapsed)
    }

    setTimeRemaining(calculateRemaining())

    if (timerState.isPaused) return

    const interval = setInterval(() => {
      const remaining = calculateRemaining()
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timerState, todayKey])

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

function formatEndTime(endTimestamp: number): string {
  const date = new Date(endTimestamp)
  // Format in MST (America/Denver handles MST/MDT automatically)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Denver',
  }) + ' MST'
}

function calculateEndTime(timerState: TimerState): number | null {
  if (!timerState.startTime) return null

  // End time = start time + 14 hours + total paused time + current pause duration
  let endTime = timerState.startTime + FOURTEEN_HOURS_MS + timerState.totalPausedTime

  // If currently paused, add the ongoing pause duration
  if (timerState.isPaused && timerState.pausedAt) {
    endTime += Date.now() - timerState.pausedAt
  }

  return endTime
}

// Use local date, not UTC
function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// =============================================================================
// Sub-Components
// =============================================================================

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        type="button"
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
      type="button"
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

interface PauseModalProps {
  isOpen: boolean
  onSelect: (reason: PauseReason) => void
  onCancel: () => void
}

function PauseModal({ isOpen, onSelect, onCancel }: PauseModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const firstButtonRef = React.useRef<HTMLButtonElement>(null)

  // Focus trap and ESC key handler
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstButtonRef.current?.focus()

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="pause-modal-title" className="text-lg font-semibold text-center">
          Pause Reason
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Select a reason for pausing the timer
        </p>
        <div className="space-y-2">
          {PAUSE_REASONS.map((reason, index) => (
            <button
              key={reason}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              onClick={() => onSelect(reason)}
              className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {reason}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full p-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

interface TimerCardProps {
  timeRemaining: number
  timerState: TimerState
  currentPauseReason: PauseReason | null
  todayKey: string
  onReset: () => void
  onPause: () => void
  onResume: () => void
}

function TimerCard({ timeRemaining, timerState, currentPauseReason, todayKey, onReset, onPause, onResume }: TimerCardProps) {
  const isRunning = timerState.startTime !== null && timerState.dateKey === todayKey
  const isExpired = timeRemaining <= 0 && isRunning
  const endTime = calculateEndTime(timerState)

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Time Remaining
        </span>
        <div className="flex items-center gap-2">
          {isRunning && !isExpired && (
            timerState.isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors"
                aria-label="Resume timer"
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                aria-label="Pause timer"
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
            )
          )}
          {isRunning && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>
      <div
        className={cn(
          "text-4xl md:text-5xl font-mono font-bold tracking-tight text-center tabular-nums",
          isExpired ? "text-destructive" : timerState.isPaused ? "text-yellow-500" : "text-foreground"
        )}
      >
        {formatTime(timeRemaining)}
      </div>
      {isRunning && endTime && !isExpired && (
        <p className="text-center text-sm font-medium text-accent mt-2">
          Ends at {formatEndTime(endTime)}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground mt-2">
        {isExpired
          ? "Time's up! Reset to start a new cycle"
          : timerState.isPaused && currentPauseReason
          ? `Paused: ${currentPauseReason}`
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
  placeholder?: string
}

function TaskForm({ onAdd, placeholder = "Add a new task..." }: TaskFormProps) {
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
        placeholder={placeholder}
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
        type="button"
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
        type="button"
        onClick={() => onDelete(todo.id)}
        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 shrink-0"
        aria-label={`Delete task: ${todo.text}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
})

interface RecurringTaskItemProps {
  task: RecurringTask
  onToggleDay: (id: string, day: number) => void
  onDelete: (id: string) => void
}

const RecurringTaskItem = React.memo(function RecurringTaskItem({ task, onToggleDay, onDelete }: RecurringTaskItemProps) {
  return (
    <div className="group p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm break-words">{task.text}</span>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 shrink-0"
          aria-label={`Delete recurring task: ${task.text}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 justify-center">
        {WEEKDAYS.map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() => onToggleDay(task.id, index)}
            className={cn(
              "w-8 h-8 text-xs rounded-md transition-colors",
              task.weekdays.includes(index)
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
            aria-label={`Toggle ${day}`}
            aria-pressed={task.weekdays.includes(index)}
          >
            {day.charAt(0)}
          </button>
        ))}
      </div>
    </div>
  )
})

interface TaskListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  title?: string
  emptyMessage?: string
  emptySubMessage?: string
}

function TaskList({ todos, onToggle, onDelete, title, emptyMessage = "No tasks yet", emptySubMessage }: TaskListProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </h3>
      )}
      {todos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-base mb-1">{emptyMessage}</p>
          {emptySubMessage && <p className="text-sm">{emptySubMessage}</p>}
        </div>
      ) : (
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
      )}
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
  const todayKey = getLocalDateKey()
  const todayDayIndex = new Date().getDay()

  const [todos, setTodos, todosLoaded] = useLocalStorage<Todo[]>(STORAGE_KEY, [])
  const [recurringTasks, setRecurringTasks, recurringLoaded] = useLocalStorage<RecurringTask[]>(RECURRING_KEY, [])
  const [pauseLogs, setPauseLogs, pauseLogsLoaded] = useLocalStorage<PauseLog[]>(PAUSE_LOG_KEY, [])
  const [recurringAddedDates, setRecurringAddedDates, recurringAddedLoaded] = useLocalStorage<string[]>(RECURRING_ADDED_KEY, [])

  const [timerState, setTimerState] = React.useState<TimerState>({
    startTime: null,
    pausedAt: null,
    totalPausedTime: 0,
    isPaused: false,
    dateKey: null,
  })
  const [mounted, setMounted] = React.useState(false)
  const [showPauseModal, setShowPauseModal] = React.useState(false)
  const [currentPauseReason, setCurrentPauseReason] = React.useState<PauseReason | null>(null)
  const [showRecurring, setShowRecurring] = React.useState(false)

  // Sync state
  const [showSyncModal, setShowSyncModal] = React.useState(false)
  const [syncState, setSyncState] = React.useState<LocalSyncState | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const timeRemaining = usePausableTimer(timerState, todayKey)

  // Filter todos for today
  const todayTodos = React.useMemo(
    () => todos.filter(t => t.dateKey === todayKey),
    [todos, todayKey]
  )
  const completedCount = React.useMemo(
    () => todayTodos.filter(t => t.completed).length,
    [todayTodos]
  )

  // Count incomplete tasks from previous days
  const previousIncompleteTasks = React.useMemo(
    () => todos.filter(t => t.dateKey !== todayKey && !t.completed),
    [todos, todayKey]
  )

  // Load timer state from localStorage and check sync state
  React.useEffect(() => {
    setMounted(true)

    // Check for existing sync state
    const existingSyncState = getLocalSyncState()
    if (existingSyncState) {
      setSyncState(existingSyncState)
    }

    try {
      const storedTimer = localStorage.getItem(TIMER_KEY)
      if (storedTimer) {
        const parsed = JSON.parse(storedTimer) as TimerState

        // Reset timer if it's from a different day
        if (parsed.dateKey !== todayKey) {
          setTimerState({
            startTime: null,
            pausedAt: null,
            totalPausedTime: 0,
            isPaused: false,
            dateKey: null,
          })
          localStorage.removeItem(TIMER_KEY)
        } else {
          setTimerState(parsed)
        }
      }
    } catch (error) {
      console.warn("Error reading timer from localStorage:", error)
    }
  }, [todayKey])

  // Debounced sync to server
  const syncToServer = React.useCallback(async () => {
    if (!syncState) return

    setIsSyncing(true)
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-code": syncState.syncCode,
          "x-auth-token": syncState.authToken,
        },
        body: JSON.stringify({
          todos,
          recurringTasks,
          pauseLogs,
          timerState,
          recurringAddedDates,
        }),
      })
    } catch (error) {
      console.warn("Sync failed:", error)
    } finally {
      setIsSyncing(false)
    }
  }, [syncState, todos, recurringTasks, pauseLogs, timerState, recurringAddedDates])

  // Trigger sync when data changes (debounced)
  React.useEffect(() => {
    if (!mounted || !syncState || !todosLoaded) return

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToServer()
    }, 1000) // 1 second debounce

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [mounted, syncState, todos, recurringTasks, pauseLogs, timerState, recurringAddedDates, todosLoaded, syncToServer])

  // Handle sync data received from login
  const handleSyncData = React.useCallback((newSyncState: LocalSyncState, data: any) => {
    setSyncState(newSyncState)

    // Merge remote data with local data (remote wins for now)
    if (data.todos) {
      setTodos(data.todos)
    }
    if (data.recurringTasks) {
      setRecurringTasks(data.recurringTasks)
    }
    if (data.pauseLogs) {
      setPauseLogs(data.pauseLogs)
    }
    if (data.timerState) {
      setTimerState(data.timerState)
      localStorage.setItem(TIMER_KEY, JSON.stringify(data.timerState))
    }
    if (data.recurringAddedDates) {
      setRecurringAddedDates(data.recurringAddedDates)
    }
  }, [setTodos, setRecurringTasks, setPauseLogs, setRecurringAddedDates])

  // Get current data for sync setup
  const getCurrentData = React.useCallback(() => ({
    todos,
    recurringTasks,
    pauseLogs,
    timerState,
    recurringAddedDates,
  }), [todos, recurringTasks, pauseLogs, timerState, recurringAddedDates])

  // Restore pause reason after pauseLogs are loaded
  React.useEffect(() => {
    if (!pauseLogsLoaded || !timerState.isPaused) return

    const activePause = pauseLogs.find(p => p.endTime === null)
    if (activePause) {
      setCurrentPauseReason(activePause.reason)
    }
  }, [pauseLogsLoaded, pauseLogs, timerState.isPaused])

  // Save timer state to localStorage
  React.useEffect(() => {
    if (mounted && timerState.startTime) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timerState))
    }
  }, [timerState, mounted])

  // Add recurring tasks for today (only once per day)
  React.useEffect(() => {
    if (!mounted || !recurringLoaded || !recurringAddedLoaded || !todosLoaded) return

    // Check if we already added recurring tasks today
    if (recurringAddedDates.includes(todayKey)) return

    const tasksToAdd: Todo[] = []

    recurringTasks.forEach((task) => {
      if (task.weekdays.includes(todayDayIndex)) {
        // Check if this recurring task was already added today
        const alreadyExists = todos.some(
          (t) => t.dateKey === todayKey && t.text === task.text
        )
        if (!alreadyExists) {
          tasksToAdd.push({
            id: crypto.randomUUID(),
            text: task.text,
            completed: false,
            createdAt: Date.now(),
            dateKey: todayKey,
          })
        }
      }
    })

    if (tasksToAdd.length > 0) {
      setTodos((prev) => [...tasksToAdd, ...prev])
    }

    // Mark today as processed
    setRecurringAddedDates((prev) => {
      // Keep only last 7 days to prevent unbounded growth
      const newDates = [...prev, todayKey].slice(-7)
      return newDates
    })
  }, [mounted, recurringLoaded, recurringAddedLoaded, todosLoaded, todayKey, todayDayIndex, recurringTasks, recurringAddedDates])

  const addTodo = React.useCallback((text: string) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
      dateKey: todayKey,
    }

    setTodos((prev) => {
      // Start timer on first task of the day
      const todayTaskCount = prev.filter(t => t.dateKey === todayKey).length
      if (todayTaskCount === 0 && (!timerState.startTime || timerState.dateKey !== todayKey)) {
        const now = Date.now()
        const newTimerState: TimerState = {
          startTime: now,
          pausedAt: null,
          totalPausedTime: 0,
          isPaused: false,
          dateKey: todayKey,
        }
        setTimerState(newTimerState)
        localStorage.setItem(TIMER_KEY, JSON.stringify(newTimerState))
      }
      return [todo, ...prev]
    })
  }, [setTodos, timerState.startTime, timerState.dateKey, todayKey])

  const addRecurringTask = React.useCallback((text: string) => {
    const task: RecurringTask = {
      id: crypto.randomUUID(),
      text,
      weekdays: [1, 2, 3, 4, 5], // Default to weekdays (Mon-Fri)
    }
    setRecurringTasks((prev) => [...prev, task])
  }, [setRecurringTasks])

  const toggleRecurringDay = React.useCallback((id: string, day: number) => {
    setRecurringTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task
        const newWeekdays = task.weekdays.includes(day)
          ? task.weekdays.filter((d) => d !== day)
          : [...task.weekdays, day].sort((a, b) => a - b)
        return { ...task, weekdays: newWeekdays }
      })
    )
  }, [setRecurringTasks])

  const deleteRecurringTask = React.useCallback((id: string) => {
    setRecurringTasks((prev) => prev.filter((task) => task.id !== id))
  }, [setRecurringTasks])

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
    const newState: TimerState = {
      startTime: now,
      pausedAt: null,
      totalPausedTime: 0,
      isPaused: false,
      dateKey: todayKey,
    }
    setTimerState(newState)
    localStorage.setItem(TIMER_KEY, JSON.stringify(newState))
    setCurrentPauseReason(null)
  }, [todayKey])

  const handlePauseClick = React.useCallback(() => {
    setShowPauseModal(true)
  }, [])

  const handlePauseSelect = React.useCallback((reason: PauseReason) => {
    const now = Date.now()

    // Create pause log entry
    const pauseLog: PauseLog = {
      id: crypto.randomUUID(),
      reason,
      startTime: now,
      endTime: null,
      duration: 0,
      dateKey: todayKey,
    }

    setPauseLogs((prev) => {
      // Limit pause logs to prevent unbounded growth
      const newLogs = [...prev, pauseLog]
      if (newLogs.length > MAX_PAUSE_LOGS) {
        return newLogs.slice(-MAX_PAUSE_LOGS)
      }
      return newLogs
    })

    // Update timer state
    setTimerState((prev) => {
      const newState = {
        ...prev,
        pausedAt: now,
        isPaused: true,
      }
      localStorage.setItem(TIMER_KEY, JSON.stringify(newState))
      return newState
    })

    setCurrentPauseReason(reason)
    setShowPauseModal(false)
  }, [setPauseLogs, todayKey])

  const handleResume = React.useCallback(() => {
    const now = Date.now()

    // Update the active pause log
    setPauseLogs((prev) =>
      prev.map((log) => {
        if (log.endTime === null) {
          return {
            ...log,
            endTime: now,
            duration: now - log.startTime,
          }
        }
        return log
      })
    )

    // Calculate additional paused time
    const pauseDuration = timerState.pausedAt ? now - timerState.pausedAt : 0

    setTimerState((prev) => {
      const newState = {
        ...prev,
        pausedAt: null,
        totalPausedTime: prev.totalPausedTime + pauseDuration,
        isPaused: false,
      }
      localStorage.setItem(TIMER_KEY, JSON.stringify(newState))
      return newState
    })

    setCurrentPauseReason(null)
  }, [timerState.pausedAt, setPauseLogs])

  const rolloverTasks = React.useCallback(() => {
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.dateKey !== todayKey && !todo.completed) {
          return { ...todo, dateKey: todayKey }
        }
        return todo
      })
    )
  }, [todayKey, setTodos])

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
          <SyncButton
            onClick={() => setShowSyncModal(true)}
            isSynced={!!syncState}
            isSyncing={isSyncing}
          />
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
          timerState={timerState}
          currentPauseReason={currentPauseReason}
          todayKey={todayKey}
          onReset={resetTimer}
          onPause={handlePauseClick}
          onResume={handleResume}
        />

        <ProgressCard
          completed={completedCount}
          total={todayTodos.length}
        />

        {/* Rollover Banner */}
        {previousIncompleteTasks.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                {previousIncompleteTasks.length} incomplete task{previousIncompleteTasks.length > 1 ? 's' : ''} from previous days
              </p>
              <p className="text-xs text-muted-foreground">Roll them over to today?</p>
            </div>
            <button
              type="button"
              onClick={rolloverTasks}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-medium transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Rollover
            </button>
          </div>
        )}

        <TaskForm onAdd={addTodo} />

        <TaskList
          todos={todayTodos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          title={`Today's Tasks — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
          emptyMessage="No tasks yet"
          emptySubMessage="Add your signal tasks to start the 14-hour countdown"
        />

        {/* Recurring Tasks Section */}
        <section className="border-t border-border pt-8 space-y-4">
          <button
            type="button"
            onClick={() => setShowRecurring(!showRecurring)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Weekday Recurring Tasks
            </h3>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              showRecurring && "rotate-180"
            )} />
          </button>

          {showRecurring && (
            <div className="space-y-4">
              <TaskForm
                onAdd={addRecurringTask}
                placeholder="Add a recurring task..."
              />
              {recurringTasks.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No recurring tasks. Add tasks that repeat on specific days.
                </p>
              ) : (
                <div className="space-y-2">
                  {recurringTasks.map((task) => (
                    <RecurringTaskItem
                      key={task.id}
                      task={task}
                      onToggleDay={toggleRecurringDay}
                      onDelete={deleteRecurringTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <Manifesto />

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
          <p>Add to home screen for the best experience</p>
        </footer>
      </div>

      {/* Pause Modal */}
      <PauseModal
        isOpen={showPauseModal}
        onSelect={handlePauseSelect}
        onCancel={() => setShowPauseModal(false)}
      />

      {/* Sync Modal */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSync={handleSyncData}
        getCurrentData={getCurrentData}
      />
    </div>
  )
}
