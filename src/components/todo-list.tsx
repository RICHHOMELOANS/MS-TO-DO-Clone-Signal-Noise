"use client"

import * as React from "react"
import { Plus, Moon, Sun, Trash2, Check, RotateCcw, Pause, Play, ChevronDown, RefreshCw, Calendar, Star, Link2, Bell, Clock } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { SyncModal, SyncButton } from "@/components/sync-modal"
import { getLocalSyncState, type LocalSyncState } from "@/lib/sync"
import { Sidebar, type ListId, type TaskList } from "@/components/sidebar"
import { TaskDetailPanel, type TaskStep } from "@/components/task-detail-panel"
import { SEED_BUCKETS, SEED_LISTS, SEED_TODOS, type Bucket, type BucketGroup, type SeedTodo } from "@/lib/data-seed"

// =============================================================================
// Types
// =============================================================================

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  dateKey: string // YYYY-MM-DD format for day tracking (local time)
  // Enhanced fields (SON original)
  important: boolean
  myDay: boolean
  dueDate: string | null
  steps: TaskStep[]
  notes: string
  listId: string
  // Extended fields (from master-todo artifact)
  bucketId: string
  starred: boolean
  link: string | null
  hasFiles: boolean
  hasNote: boolean
  recurring: string | null
  reminder: string | null
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
const CUSTOM_LISTS_KEY = "signal-over-noise-custom-lists"
const BUCKETS_KEY = "signal-over-noise-buckets"
const BUCKET_GROUPS_KEY = "signal-over-noise-bucket-groups"
const SEEDED_KEY = "signal-over-noise-seeded"
const FOURTEEN_HOURS_MS = 14 * 60 * 60 * 1000
const MAX_PAUSE_LOGS = 100

const PAUSE_REASONS: PauseReason[] = [
  "Lunch", "AM Break", "PM Break", "Appointment", "Meeting", "Phone Call",
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
      if (remaining <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerState, todayKey])

  return timeRemaining
}

// =============================================================================
// Utility Functions
// =============================================================================

function migrateTodo(todo: Partial<Todo> & { id: string; text: string; completed: boolean; createdAt: number; dateKey: string }): Todo {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.createdAt,
    dateKey: todo.dateKey,
    important: todo.important ?? false,
    myDay: todo.myDay ?? false,
    dueDate: todo.dueDate ?? null,
    steps: Array.isArray(todo.steps) ? todo.steps : [],
    notes: todo.notes ?? "",
    listId: todo.listId ?? "tasks",
    bucketId: todo.bucketId ?? "",
    starred: todo.starred ?? false,
    link: todo.link ?? null,
    hasFiles: todo.hasFiles ?? false,
    hasNote: todo.hasNote ?? false,
    recurring: todo.recurring ?? null,
    reminder: todo.reminder ?? null,
  }
}

function convertSeedToTodo(seed: SeedTodo): Todo {
  return {
    id: seed.id,
    text: seed.text,
    completed: seed.completed,
    createdAt: seed.createdAt,
    dateKey: seed.dateKey,
    important: seed.important,
    myDay: seed.myDay,
    dueDate: seed.dueDate,
    steps: seed.steps,
    notes: seed.notes,
    listId: seed.listId,
    bucketId: seed.bucketId,
    starred: seed.starred,
    link: seed.link,
    hasFiles: seed.hasFiles,
    hasNote: seed.hasNote,
    recurring: seed.recurring,
    reminder: seed.reminder,
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatEndTime(endTimestamp: number): string {
  const date = new Date(endTimestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver',
  }) + ' MST'
}

function calculateEndTime(timerState: TimerState): number | null {
  if (!timerState.startTime) return null
  let endTime = timerState.startTime + FOURTEEN_HOURS_MS + timerState.totalPausedTime
  if (timerState.isPaused && timerState.pausedAt) {
    endTime += Date.now() - timerState.pausedAt
  }
  return endTime
}

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
      <button type="button" className="inline-flex items-center justify-center rounded-md size-9 text-muted-foreground" disabled aria-label="Loading theme">
        <span className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-md size-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

interface PauseModalProps { isOpen: boolean; onSelect: (reason: PauseReason) => void; onCancel: () => void }

function PauseModal({ isOpen, onSelect, onCancel }: PauseModalProps) {
  const firstButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    firstButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }} role="dialog" aria-modal="true" aria-labelledby="pause-modal-title">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 id="pause-modal-title" className="text-lg font-semibold text-center">Pause Reason</h3>
        <p className="text-sm text-muted-foreground text-center">Select a reason for pausing the timer</p>
        <div className="space-y-2">
          {PAUSE_REASONS.map((reason, index) => (
            <button key={reason} ref={index === 0 ? firstButtonRef : undefined} type="button" onClick={() => onSelect(reason)}
              className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {reason}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="w-full p-3 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  )
}

interface SetTimeModalProps { isOpen: boolean; onSet: (startTime: Date) => void; onCancel: () => void }

function SetTimeModal({ isOpen, onSet, onCancel }: SetTimeModalProps) {
  const [timeValue, setTimeValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setTimeValue(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      setError(null)
      // Focus input after React renders
      inputRef.current?.focus()
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = '' }
  }, [isOpen, onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!timeValue) return
    const [hours, minutes] = timeValue.split(':').map(Number)
    const startTime = new Date()
    startTime.setHours(hours, minutes, 0, 0)

    // Validate start time is not in the future
    if (startTime.getTime() > Date.now()) {
      setError("Start time cannot be in the future")
      return
    }

    setError(null)
    onSet(startTime)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }} role="dialog" aria-modal="true" aria-labelledby="set-time-modal-title">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 id="set-time-modal-title" className="text-lg font-semibold text-center">Set Start Time</h3>
        <p className="text-sm text-muted-foreground text-center">Enter the time you started working today</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input ref={inputRef} type="time" value={timeValue} onChange={(e) => { setTimeValue(e.target.value); setError(null) }}
            className="w-full h-12 px-4 bg-background border border-border rounded-md text-center text-lg font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required aria-describedby={error ? "set-time-error" : undefined} />
          {error && <p id="set-time-error" className="text-sm text-destructive text-center" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="flex-1 p-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors">Cancel</button>
            <button type="submit" className="flex-1 p-3 text-sm bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors">Set Time</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TimerCardProps { timeRemaining: number; timerState: TimerState; currentPauseReason: PauseReason | null; todayKey: string; onReset: () => void; onPause: () => void; onResume: () => void; onSetTime: () => void }

function TimerCard({ timeRemaining, timerState, currentPauseReason, todayKey, onReset, onPause, onResume, onSetTime }: TimerCardProps) {
  const isRunning = timerState.startTime !== null && timerState.dateKey === todayKey
  const isExpired = timeRemaining <= 0 && isRunning
  const endTime = calculateEndTime(timerState)

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Time Remaining</span>
        <div className="flex items-center gap-2">
          {isRunning && !isExpired && (
            timerState.isPaused ? (
              <button type="button" onClick={onResume} className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors" aria-label="Resume timer"><Play className="w-3 h-3" />Resume</button>
            ) : (
              <button type="button" onClick={onPause} className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors" aria-label="Pause timer"><Pause className="w-3 h-3" />Pause</button>
            )
          )}
          {isRunning && (
            <button type="button" onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" aria-label="Reset timer"><RotateCcw className="w-3 h-3" />Reset</button>
          )}
          <button type="button" onClick={onSetTime} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors" aria-label="Set start time"><Clock className="w-3 h-3" />Set</button>
        </div>
      </div>
      <div className={cn("text-4xl md:text-5xl font-mono font-bold tracking-tight text-center tabular-nums", isExpired ? "text-destructive" : timerState.isPaused ? "text-yellow-500" : "text-foreground")}>
        {formatTime(timeRemaining)}
      </div>
      {isRunning && endTime && !isExpired && <p className="text-center text-sm font-medium text-accent mt-2">Ends at {formatEndTime(endTime)}</p>}
      <p className="text-center text-xs text-muted-foreground mt-2">
        {isExpired ? "Time's up! Reset to start a new cycle" : timerState.isPaused && currentPauseReason ? `Paused: ${currentPauseReason}` : isRunning ? "Focus on your signal tasks" : "Click Set to start your timer"}
      </p>
    </div>
  )
}

function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Progress</span>
        <span className="text-sm font-medium">{completed}/{total} tasks</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3">
        <div className="h-full bg-accent transition-all duration-500 ease-out rounded-full" style={{ width: `${percent}%` }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} />
      </div>
      <div className="text-center"><span className="text-3xl md:text-4xl font-bold text-accent">{percent}%</span><span className="text-muted-foreground ml-2">complete</span></div>
    </div>
  )
}

// =============================================================================
// Enhanced TaskForm with target list, due date, reminder, recurring
// =============================================================================

interface EnhancedTaskFormProps {
  onAdd: (text: string, opts?: { listId?: string; dueDate?: string; reminder?: string; recurring?: string; starred?: boolean }) => void
  placeholder?: string
  currentListId: string
  allLists: Array<{ id: string; name: string; bucketName?: string }>
}

function EnhancedTaskForm({ onAdd, placeholder = "Add a new task...", currentListId, allLists }: EnhancedTaskFormProps) {
  const [text, setText] = React.useState("")
  const [showOptions, setShowOptions] = React.useState(false)
  const [targetList, setTargetList] = React.useState<string | null>(null)
  const [dueDate, setDueDate] = React.useState("")
  const [reminder, setReminder] = React.useState("")
  const [recurring, setRecurring] = React.useState("")
  const [showListPicker, setShowListPicker] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const reset = React.useCallback(() => {
    setTargetList(null); setDueDate(""); setReminder(""); setRecurring("")
    setShowOptions(false); setShowListPicker(false)
  }, [])

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) { inputRef.current?.focus(); return }
    onAdd(trimmed, {
      listId: targetList || undefined,
      dueDate: dueDate || undefined,
      reminder: reminder || undefined,
      recurring: recurring || undefined,
    })
    setText("")
    reset()
  }, [text, targetList, dueDate, reminder, recurring, onAdd, reset])

  const todayISO = getLocalDateKey()
  const tomorrowISO = React.useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return getLocalDateKey(d) }, [])
  const nextWeekISO = React.useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 7); return getLocalDateKey(d) }, [])

  const targetName = targetList ? allLists.find(l => l.id === targetList)?.name : null

  return (
    <div className="space-y-2">
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
        <button type="submit" className="h-12 w-12 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md inline-flex items-center justify-center transition-colors" aria-label="Add task">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Option chips */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => { setShowListPicker(!showListPicker); setShowOptions(false) }}
          className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", targetList ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
          {targetName ? `List: ${targetName}` : "List"}
        </button>
        <button type="button" onClick={() => { setShowOptions(!showOptions); setShowListPicker(false) }}
          className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", dueDate ? "border-blue-400 text-blue-400 bg-blue-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
          {dueDate ? `Due: ${dueDate === todayISO ? "Today" : dueDate === tomorrowISO ? "Tomorrow" : dueDate}` : "Due Date"}
        </button>
        <button type="button" onClick={() => { setShowOptions(!showOptions); setShowListPicker(false) }}
          className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", reminder ? "border-yellow-400 text-yellow-400 bg-yellow-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
          {reminder ? `Reminder: ${reminder}` : "Reminder"}
        </button>
        <button type="button" onClick={() => { setShowOptions(!showOptions); setShowListPicker(false) }}
          className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", recurring ? "border-green-400 text-green-400 bg-green-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
          {recurring ? `Repeat: ${recurring}` : "Repeat"}
        </button>

        {/* Clear pills */}
        {(targetList || dueDate || reminder || recurring) && (
          <button type="button" onClick={reset} className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">Clear</button>
        )}
      </div>

      {/* List picker dropdown */}
      {showListPicker && (
        <div className="bg-card border border-border rounded-lg p-2 max-h-60 overflow-y-auto space-y-0.5">
          {allLists.map((list) => (
            <button key={list.id} type="button"
              onClick={() => { setTargetList(list.id === currentListId ? null : list.id); setShowListPicker(false) }}
              className={cn("w-full text-left text-sm px-3 py-1.5 rounded hover:bg-accent/50 transition-colors", list.id === (targetList || currentListId) && "bg-accent")}>
              {list.bucketName ? `${list.bucketName} > ` : ""}{list.name}
            </button>
          ))}
        </div>
      )}

      {/* Options panel */}
      {showOptions && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          {/* Date quick picks */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Due Date</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {[{ label: "Today", iso: todayISO }, { label: "Tomorrow", iso: tomorrowISO }, { label: "Next week", iso: nextWeekISO }].map((opt) => (
                <button key={opt.label} type="button" onClick={() => setDueDate(dueDate === opt.iso ? "" : opt.iso)}
                  className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors", dueDate === opt.iso ? "border-blue-400 text-blue-400 bg-blue-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  {opt.label}
                </button>
              ))}
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-xs bg-transparent border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none" />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Reminder</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {["Later today", "Tomorrow", "Next week"].map((opt) => (
                <button key={opt} type="button" onClick={() => setReminder(reminder === opt ? "" : opt)}
                  className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors", reminder === opt ? "border-yellow-400 text-yellow-400 bg-yellow-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Repeat</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {["Daily", "Weekdays", "Weekly", "Monthly", "Yearly"].map((opt) => (
                <button key={opt} type="button" onClick={() => setRecurring(recurring === opt.toLowerCase() ? "" : opt.toLowerCase())}
                  className={cn("text-xs px-2.5 py-1 rounded-md border transition-colors", recurring === opt.toLowerCase() ? "border-green-400 text-green-400 bg-green-400/10" : "border-border text-muted-foreground hover:border-muted-foreground")}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// TaskItem
// =============================================================================

function formatDueDateShort(dateStr: string | null): string | null {
  if (!dateStr) return null
  const todayStr = getLocalDateKey()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = getLocalDateKey(tomorrow)
  if (dateStr === todayStr) return "Today"
  if (dateStr === tomorrowStr) return "Tomorrow"
  // Parse the dateStr as local date (YYYY-MM-DD format)
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const todayStr = getLocalDateKey()
  return dateStr < todayStr
}

interface TaskItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onToggleImportant: (id: string) => void
  onClick: (todo: Todo) => void
  isSelected?: boolean
}

const TaskItem = React.memo(function TaskItem({ todo, onToggle, onDelete, onToggleImportant, onClick, isSelected }: TaskItemProps) {
  const isStarred = todo.important || todo.starred
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(todo)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(todo) }}
      className={cn(
        "group flex items-center gap-3 p-4 rounded-xl border bg-card transition-all cursor-pointer",
        isSelected ? "border-primary shadow-md" : "border-border hover:border-muted-foreground/50",
        todo.completed && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(todo.id) }}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
          todo.completed ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/30 hover:border-accent"
        )}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      >
        {todo.completed && <Check className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm break-words block", todo.completed && "line-through text-muted-foreground")}>
          {todo.starred && <Star size={12} className="inline fill-yellow-400 text-yellow-400 mr-1.5" />}
          {todo.text}
        </span>
        {/* Meta info row */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {todo.myDay && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Sun size={12} />My Day</span>
          )}
          {todo.dueDate && (
            <span className={cn("flex items-center gap-1 text-xs", isOverdue(todo.dueDate) && !todo.completed ? "text-destructive" : "text-muted-foreground")}>
              <Calendar size={12} />{formatDueDateShort(todo.dueDate)}
            </span>
          )}
          {todo.recurring && (
            <span className="flex items-center gap-1 text-xs text-green-500"><RotateCcw size={11} />{todo.recurring}</span>
          )}
          {todo.reminder && (
            <span className="flex items-center gap-1 text-xs text-yellow-500"><Bell size={11} />{todo.reminder}</span>
          )}
          {todo.link && (
            <span className="flex items-center gap-1 text-xs text-blue-400"><Link2 size={11} /></span>
          )}
          {todo.steps?.length > 0 && (
            <span className="text-xs text-muted-foreground">{todo.steps.filter(s => s.completed).length}/{todo.steps.length}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleImportant(todo.id) }}
        className="p-1 hover:bg-accent rounded transition-colors shrink-0"
        aria-label={isStarred ? "Remove from important" : "Mark as important"}
      >
        <Star className={cn("w-4 h-4", isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(todo.id) }}
        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 shrink-0"
        aria-label={`Delete task: ${todo.text}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
})

// =============================================================================
// RecurringTaskItem
// =============================================================================

const RecurringTaskItem = React.memo(function RecurringTaskItem({ task, onToggleDay, onDelete }: { task: RecurringTask; onToggleDay: (id: string, day: number) => void; onDelete: (id: string) => void }) {
  return (
    <div className="group p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm break-words">{task.text}</span>
        <button type="button" onClick={() => onDelete(task.id)} className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 shrink-0" aria-label={`Delete recurring task: ${task.text}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 justify-center">
        {WEEKDAYS.map((day, index) => (
          <button key={day} type="button" onClick={() => onToggleDay(task.id, index)}
            className={cn("w-8 h-8 text-xs rounded-md transition-colors", task.weekdays.includes(index) ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
            aria-label={`Toggle ${day}`} aria-pressed={task.weekdays.includes(index)}>
            {day.charAt(0)}
          </button>
        ))}
      </div>
    </div>
  )
})

// =============================================================================
// TaskList Component
// =============================================================================

function TaskListComponent({ todos, onToggle, onDelete, onToggleImportant, onTaskClick, selectedTaskId, title, emptyMessage = "No tasks yet", emptySubMessage }: {
  todos: Todo[]; onToggle: (id: string) => void; onDelete: (id: string) => void; onToggleImportant: (id: string) => void; onTaskClick: (todo: Todo) => void; selectedTaskId?: string | null; title?: string; emptyMessage?: string; emptySubMessage?: string
}) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</h3>}
      {todos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-base mb-1">{emptyMessage}</p>
          {emptySubMessage && <p className="text-sm">{emptySubMessage}</p>}
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Task list">
          {todos.map((todo) => (
            <TaskItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onToggleImportant={onToggleImportant} onClick={onTaskClick} isSelected={selectedTaskId === todo.id} />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Manifesto
// =============================================================================

function Manifesto() {
  return (
    <section className="border-t border-border pt-10 mt-10 space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-center">The Signal Manifesto</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-2">The Mission</h3>
          <p className="text-sm text-foreground/80 leading-relaxed">To ruthlessly eliminate the noise of modern distraction and amplify the critical work that defines your legacy.</p>
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-medium mb-2">The Statement</h3>
          <blockquote className="text-base font-medium text-accent italic border-l-2 border-accent pl-4">&ldquo;Amplify the Signal. Mute the Noise. Own the Mission.&rdquo;</blockquote>
        </div>
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

  const [rawTodos, setTodos, todosLoaded] = useLocalStorage<Todo[]>(STORAGE_KEY, [])
  const todos = React.useMemo(() => rawTodos.map(migrateTodo), [rawTodos])
  const [recurringTasks, setRecurringTasks, recurringLoaded] = useLocalStorage<RecurringTask[]>(RECURRING_KEY, [])
  const [pauseLogs, setPauseLogs, pauseLogsLoaded] = useLocalStorage<PauseLog[]>(PAUSE_LOG_KEY, [])
  const [recurringAddedDates, setRecurringAddedDates, recurringAddedLoaded] = useLocalStorage<string[]>(RECURRING_ADDED_KEY, [])
  const [customLists, setCustomLists, customListsLoaded] = useLocalStorage<TaskList[]>(CUSTOM_LISTS_KEY, [])
  const [buckets, setBuckets, bucketsLoaded] = useLocalStorage<Bucket[]>(BUCKETS_KEY, [])
  const [bucketGroups, setBucketGroups, bucketGroupsLoaded] = useLocalStorage<BucketGroup[]>(BUCKET_GROUPS_KEY, [])

  const [timerState, setTimerState] = React.useState<TimerState>({ startTime: null, pausedAt: null, totalPausedTime: 0, isPaused: false, dateKey: null })
  const [mounted, setMounted] = React.useState(false)
  const [showPauseModal, setShowPauseModal] = React.useState(false)
  const [showSetTimeModal, setShowSetTimeModal] = React.useState(false)
  const [currentPauseReason, setCurrentPauseReason] = React.useState<PauseReason | null>(null)
  const [showRecurring, setShowRecurring] = React.useState(false)
  const [showCompleted, setShowCompleted] = React.useState(true)
  const [selectedListId, setSelectedListId] = React.useState<ListId>("myday")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const selectedTask = React.useMemo(() => selectedTaskId ? todos.find(t => t.id === selectedTaskId) ?? null : null, [selectedTaskId, todos])

  // Sync state
  const [showSyncModal, setShowSyncModal] = React.useState(false)
  const [syncState, setSyncState] = React.useState<LocalSyncState | null>(null)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = React.useRef(0)
  const maxRetries = 3

  const timeRemaining = usePausableTimer(timerState, todayKey)

  // --- Seed data on first launch ---
  React.useEffect(() => {
    if (!mounted || !todosLoaded || !customListsLoaded || !bucketsLoaded || !bucketGroupsLoaded) return

    // Always ensure buckets and bucket groups exist (even if user has existing tasks)
    if (buckets.length === 0) {
      setBuckets(SEED_BUCKETS)
    }
    if (bucketGroups.length === 0) {
      setBucketGroups(SEED_LISTS)
    }

    // Only seed tasks if localStorage is completely empty
    const alreadySeeded = localStorage.getItem(SEEDED_KEY)
    if (alreadySeeded) return
    if (rawTodos.length > 0) {
      // Already has tasks, mark as seeded but don't replace them
      localStorage.setItem(SEEDED_KEY, "true")
      return
    }
    // Seed tasks only if empty
    setTodos(SEED_TODOS.map(convertSeedToTodo))
    localStorage.setItem(SEEDED_KEY, "true")
  }, [mounted, todosLoaded, customListsLoaded, bucketsLoaded, bucketGroupsLoaded, rawTodos.length, buckets.length, bucketGroups.length, setBuckets, setBucketGroups, setTodos])

  // --- Computed values ---
  const todayTodos = React.useMemo(() => todos.filter(t => t.dateKey === todayKey), [todos, todayKey])
  const completedCount = React.useMemo(() => todayTodos.filter(t => t.completed).length, [todayTodos])

  // Build flat list of all bucket group lists for the enhanced add form
  const allListOptions = React.useMemo(() => {
    const opts: Array<{ id: string; name: string; bucketName?: string }> = []
    // System lists
    opts.push({ id: "myday", name: "My Day" })
    opts.push({ id: "important", name: "Important" })
    opts.push({ id: "planned", name: "Planned" })
    opts.push({ id: "tasks", name: "Tasks" })
    // Bucket groups
    buckets.forEach(b => {
      const groups = bucketGroups.filter(g => g.bucketId === b.id)
      groups.forEach(g => opts.push({ id: g.id, name: g.name, bucketName: b.name }))
    })
    // Custom lists
    customLists.forEach(l => opts.push({ id: l.id, name: l.name }))
    return opts
  }, [buckets, bucketGroups, customLists])

  const filteredTodos = React.useMemo(() => {
    let filtered = todos
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => t.text.toLowerCase().includes(query) || (t.notes || "").toLowerCase().includes(query))
    } else {
      switch (selectedListId) {
        case "myday": filtered = filtered.filter(t => t.myDay || t.dateKey === todayKey); break
        case "important": filtered = filtered.filter(t => t.important || t.starred); break
        case "planned": filtered = filtered.filter(t => t.dueDate); break
        case "tasks": filtered = filtered.filter(t => t.listId === "tasks" || !t.listId); break
        default: filtered = filtered.filter(t => t.listId === selectedListId); break
      }
    }
    return {
      incomplete: filtered.filter(t => !t.completed),
      completed: filtered.filter(t => t.completed),
    }
  }, [todos, selectedListId, searchQuery, todayKey])

  const taskCounts = React.useMemo(() => {
    const counts: Record<string, number> = { myday: 0, important: 0, planned: 0, tasks: 0 }
    for (const t of todos) {
      if (t.completed) continue
      if (t.myDay || t.dateKey === todayKey) counts.myday++
      if (t.important || t.starred) counts.important++
      if (t.dueDate) counts.planned++
      if (t.listId === "tasks" || !t.listId) counts.tasks++
      if (t.listId && t.listId !== "tasks") {
        counts[t.listId] = (counts[t.listId] || 0) + 1
      }
    }
    return counts
  }, [todos, todayKey])

  const getTaskCount = React.useCallback((listId: ListId) => taskCounts[listId] || 0, [taskCounts])
  const previousIncompleteTasks = React.useMemo(() => todos.filter(t => t.dateKey !== todayKey && !t.completed), [todos, todayKey])

  // --- Mount + timer + sync init ---
  React.useEffect(() => {
    setMounted(true)
    const existingSyncState = getLocalSyncState()
    if (existingSyncState) setSyncState(existingSyncState)
    try {
      const storedTimer = localStorage.getItem(TIMER_KEY)
      if (storedTimer) {
        const parsed = JSON.parse(storedTimer) as TimerState
        if (parsed.dateKey !== todayKey) {
          setTimerState({ startTime: null, pausedAt: null, totalPausedTime: 0, isPaused: false, dateKey: null })
          localStorage.removeItem(TIMER_KEY)
        } else {
          setTimerState(parsed)
        }
      }
    } catch (error) { console.warn("Error reading timer:", error) }
  }, [todayKey])

  // --- Sync to server ---
  const syncToServer = React.useCallback(async (retryCount = 0) => {
    if (!syncState) return
    setIsSyncing(true); setSyncError(null)
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sync-code": syncState.syncCode, "x-auth-token": syncState.authToken },
        body: JSON.stringify({ todos, recurringTasks, pauseLogs, timerState, recurringAddedDates }),
      })
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Sync failed (${response.status})`) }
      retryCountRef.current = 0
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed"
      console.warn("Sync failed:", errorMessage)
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        retryCountRef.current = retryCount + 1
        setTimeout(() => syncToServer(retryCount + 1), delay)
        return
      }
      setSyncError(errorMessage)
      retryCountRef.current = 0
    } finally { if (retryCountRef.current === 0) setIsSyncing(false) }
  }, [syncState, todos, recurringTasks, pauseLogs, timerState, recurringAddedDates])

  React.useEffect(() => {
    if (!mounted || !syncState || !todosLoaded) return
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => syncToServer(), 1000)
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current) }
  }, [mounted, syncState, todos, recurringTasks, pauseLogs, timerState, recurringAddedDates, todosLoaded, syncToServer])

  const handleSyncData = React.useCallback((newSyncState: LocalSyncState, data: Record<string, unknown>) => {
    setSyncState(newSyncState)
    if (data.todos) setTodos(data.todos as Todo[])
    if (data.recurringTasks) setRecurringTasks(data.recurringTasks as RecurringTask[])
    if (data.pauseLogs) setPauseLogs(data.pauseLogs as PauseLog[])
    if (data.timerState) { setTimerState(data.timerState as TimerState); localStorage.setItem(TIMER_KEY, JSON.stringify(data.timerState)) }
    if (data.recurringAddedDates) setRecurringAddedDates(data.recurringAddedDates as string[])
  }, [setTodos, setRecurringTasks, setPauseLogs, setRecurringAddedDates])

  const getCurrentData = React.useCallback(() => ({ todos, recurringTasks, pauseLogs, timerState, recurringAddedDates }), [todos, recurringTasks, pauseLogs, timerState, recurringAddedDates])

  // Restore pause reason
  React.useEffect(() => {
    if (!pauseLogsLoaded || !timerState.isPaused) return
    const activePause = pauseLogs.find(p => p.endTime === null)
    if (activePause) setCurrentPauseReason(activePause.reason)
  }, [pauseLogsLoaded, pauseLogs, timerState.isPaused])

  // Save timer
  React.useEffect(() => { if (mounted && timerState.startTime) localStorage.setItem(TIMER_KEY, JSON.stringify(timerState)) }, [timerState, mounted])

  // Add recurring tasks for today
  React.useEffect(() => {
    if (!mounted || !recurringLoaded || !recurringAddedLoaded || !todosLoaded) return
    if (recurringAddedDates.includes(todayKey)) return
    const tasksToAdd: Todo[] = []
    recurringTasks.forEach((task) => {
      if (task.weekdays.includes(todayDayIndex)) {
        const alreadyExists = todos.some((t) => t.dateKey === todayKey && t.text === task.text)
        if (!alreadyExists) {
          tasksToAdd.push({
            id: crypto.randomUUID(), text: task.text, completed: false, createdAt: Date.now(), dateKey: todayKey,
            important: false, myDay: true, dueDate: null, steps: [], notes: "", listId: "tasks",
            bucketId: "", starred: false, link: null, hasFiles: false, hasNote: false, recurring: null, reminder: null,
          })
        }
      }
    })
    if (tasksToAdd.length > 0) setTodos((prev) => [...tasksToAdd, ...prev])
    setRecurringAddedDates((prev) => [...prev, todayKey].slice(-7))
  }, [mounted, recurringLoaded, recurringAddedLoaded, todosLoaded, todayKey, todayDayIndex, recurringTasks, recurringAddedDates, todos, setTodos, setRecurringAddedDates])

  // --- Actions ---
  const addTodo = React.useCallback((text: string, opts?: { listId?: string; dueDate?: string; reminder?: string; recurring?: string; starred?: boolean }) => {
    const resolvedListId = opts?.listId || (selectedListId === "myday" || selectedListId === "important" || selectedListId === "planned" ? "tasks" : selectedListId)
    // Find bucket for this list
    const bg = bucketGroups.find(g => g.id === resolvedListId)
    const todo: Todo = {
      id: crypto.randomUUID(), text, completed: false, createdAt: Date.now(), dateKey: todayKey,
      important: selectedListId === "important" || (opts?.starred ?? false),
      myDay: selectedListId === "myday",
      dueDate: opts?.dueDate || (selectedListId === "planned" ? todayKey : null),
      steps: [], notes: "",
      listId: resolvedListId,
      bucketId: bg?.bucketId ?? "",
      starred: opts?.starred ?? false,
      link: null, hasFiles: false, hasNote: false,
      recurring: opts?.recurring ?? null,
      reminder: opts?.reminder ?? null,
    }
    // Start timer if this is the first task of the day (check before adding)
    const todayTaskCount = rawTodos.filter(t => t.dateKey === todayKey).length
    if (todayTaskCount === 0 && (!timerState.startTime || timerState.dateKey !== todayKey)) {
      const now = Date.now()
      const newTimerState: TimerState = { startTime: now, pausedAt: null, totalPausedTime: 0, isPaused: false, dateKey: todayKey }
      setTimerState(newTimerState)
      localStorage.setItem(TIMER_KEY, JSON.stringify(newTimerState))
    }
    setTodos((prev) => [todo, ...prev])
  }, [setTodos, rawTodos, timerState.startTime, timerState.dateKey, todayKey, selectedListId, bucketGroups])

  const addRecurringTask = React.useCallback((text: string) => {
    setRecurringTasks((prev) => [...prev, { id: crypto.randomUUID(), text, weekdays: [1, 2, 3, 4, 5] }])
  }, [setRecurringTasks])

  const toggleRecurringDay = React.useCallback((id: string, day: number) => {
    setRecurringTasks((prev) => prev.map((t) => t.id === id ? { ...t, weekdays: t.weekdays.includes(day) ? t.weekdays.filter(d => d !== day) : [...t.weekdays, day].sort((a, b) => a - b) } : t))
  }, [setRecurringTasks])

  const deleteRecurringTask = React.useCallback((id: string) => {
    setRecurringTasks((prev) => prev.filter((t) => t.id !== id))
  }, [setRecurringTasks])

  const toggleTodo = React.useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
  }, [setTodos])

  const deleteTodo = React.useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    if (selectedTaskId === id) setSelectedTaskId(null)
  }, [setTodos, selectedTaskId])

  const toggleImportant = React.useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, important: !t.important, starred: !t.important } : t))
  }, [setTodos])

  const toggleMyDay = React.useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, myDay: !t.myDay } : t))
  }, [setTodos])

  const updateTask = React.useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t))
  }, [setTodos])

  const addStep = React.useCallback((taskId: string, stepTitle: string) => {
    setTodos((prev) => prev.map((t) => t.id === taskId ? { ...t, steps: [...t.steps, { id: crypto.randomUUID(), title: stepTitle, completed: false }] } : t))
  }, [setTodos])

  const toggleStepComplete = React.useCallback((taskId: string, stepId: string) => {
    setTodos((prev) => prev.map((t) => t.id === taskId ? { ...t, steps: t.steps.map((s) => s.id === stepId ? { ...s, completed: !s.completed } : s) } : t))
  }, [setTodos])

  const deleteStep = React.useCallback((taskId: string, stepId: string) => {
    setTodos((prev) => prev.map((t) => t.id === taskId ? { ...t, steps: t.steps.filter((s) => s.id !== stepId) } : t))
  }, [setTodos])

  const addCustomList = React.useCallback((list: TaskList) => { setCustomLists((prev) => [...prev, list]) }, [setCustomLists])
  const deleteCustomList = React.useCallback((id: string) => {
    setCustomLists((prev) => prev.filter((l) => l.id !== id))
    if (selectedListId === id) setSelectedListId("myday")
  }, [setCustomLists, selectedListId])

  const resetTimer = React.useCallback(() => {
    const newState: TimerState = { startTime: null, pausedAt: null, totalPausedTime: 0, isPaused: false, dateKey: null }
    setTimerState(newState)
    localStorage.removeItem(TIMER_KEY)
    setCurrentPauseReason(null)
  }, [])

  const handlePauseClick = React.useCallback(() => { setShowPauseModal(true) }, [])

  const handleSetTimeClick = React.useCallback(() => { setShowSetTimeModal(true) }, [])

  const handleSetTime = React.useCallback((startTime: Date) => {
    const newState: TimerState = { startTime: startTime.getTime(), pausedAt: null, totalPausedTime: 0, isPaused: false, dateKey: todayKey }
    setTimerState(newState)
    localStorage.setItem(TIMER_KEY, JSON.stringify(newState))
    setShowSetTimeModal(false)
    setCurrentPauseReason(null)
  }, [todayKey])

  const handlePauseSelect = React.useCallback((reason: PauseReason) => {
    setShowPauseModal(false)
    const now = Date.now()
    setTimerState((prev) => ({ ...prev, isPaused: true, pausedAt: now }))
    setCurrentPauseReason(reason)
    setPauseLogs((prev) => {
      const newLogs = [...prev, { id: crypto.randomUUID(), reason, startTime: now, endTime: null, duration: 0, dateKey: todayKey }]
      return newLogs.slice(-MAX_PAUSE_LOGS)
    })
  }, [setPauseLogs, todayKey])

  const handleResume = React.useCallback(() => {
    const now = Date.now()
    setTimerState((prev) => {
      if (!prev.pausedAt) return prev
      const pauseDuration = now - prev.pausedAt
      return { ...prev, isPaused: false, pausedAt: null, totalPausedTime: prev.totalPausedTime + pauseDuration }
    })
    setPauseLogs((prev) => prev.map((log) => log.endTime === null ? { ...log, endTime: now, duration: now - log.startTime } : log))
    setCurrentPauseReason(null)
  }, [setPauseLogs])

  const rolloverTasks = React.useCallback(() => {
    setTodos((prev) => prev.map((todo) => todo.dateKey !== todayKey && !todo.completed ? { ...todo, dateKey: todayKey } : todo))
  }, [todayKey, setTodos])

  const listTitle = React.useMemo(() => {
    if (searchQuery) return "Search Results"
    switch (selectedListId) {
      case "myday": return "My Day"
      case "important": return "Important"
      case "planned": return "Planned"
      case "tasks": return "Tasks"
      default: {
        const bg = bucketGroups.find(g => g.id === selectedListId)
        if (bg) { const bkt = buckets.find(b => b.id === bg.bucketId); return `${bkt?.icon || ""} ${bg.name}` }
        const customList = customLists.find(l => l.id === selectedListId)
        return customList?.name || "Tasks"
      }
    }
  }, [searchQuery, selectedListId, bucketGroups, buckets, customLists])

  // --- Loading state ---
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="h-20 animate-pulse bg-muted rounded-xl" />
          <div className="h-32 animate-pulse bg-muted rounded-xl" />
          <div className="h-12 animate-pulse bg-muted rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        selectedListId={selectedListId}
        onSelectList={setSelectedListId}
        customLists={customLists}
        onAddList={addCustomList}
        onDeleteList={deleteCustomList}
        getTaskCount={getTaskCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        buckets={buckets}
        bucketGroups={bucketGroups}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{listTitle}</h1>
            {selectedListId === "myday" && !searchQuery && (
              <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SyncButton onClick={() => setShowSyncModal(true)} isSynced={!!syncState} isSyncing={isSyncing} syncError={syncError} />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
            {selectedListId === "myday" && !searchQuery && (
              <>
                <TimerCard timeRemaining={timeRemaining} timerState={timerState} currentPauseReason={currentPauseReason} todayKey={todayKey} onReset={resetTimer} onPause={handlePauseClick} onResume={handleResume} onSetTime={handleSetTimeClick} />
                <ProgressCard completed={completedCount} total={todayTodos.length} />
                {previousIncompleteTasks.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{previousIncompleteTasks.length} incomplete task{previousIncompleteTasks.length > 1 ? 's' : ''} from previous days</p>
                      <p className="text-xs text-muted-foreground">Roll them over to today?</p>
                    </div>
                    <button type="button" onClick={rolloverTasks} className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-medium transition-colors shrink-0">
                      <RefreshCw className="w-4 h-4" />Rollover
                    </button>
                  </div>
                )}
              </>
            )}

            <EnhancedTaskForm onAdd={addTodo} currentListId={selectedListId} allLists={allListOptions} />

            <TaskListComponent
              todos={filteredTodos.incomplete} onToggle={toggleTodo} onDelete={deleteTodo} onToggleImportant={toggleImportant}
              onTaskClick={(todo) => setSelectedTaskId(todo.id)} selectedTaskId={selectedTaskId}
              emptyMessage={searchQuery ? "No tasks found" : "No tasks yet"} emptySubMessage={searchQuery ? "Try a different search" : "Add your signal tasks to start"}
            />

            {filteredTodos.completed.length > 0 && (
              <div className="space-y-3">
                <button type="button" onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" aria-expanded={showCompleted} aria-label="Toggle completed tasks">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", !showCompleted && "-rotate-90")} /><span>Completed ({filteredTodos.completed.length})</span>
                </button>
                {showCompleted && <TaskListComponent todos={filteredTodos.completed} onToggle={toggleTodo} onDelete={deleteTodo} onToggleImportant={toggleImportant} onTaskClick={(todo) => setSelectedTaskId(todo.id)} selectedTaskId={selectedTaskId} />}
              </div>
            )}

            {selectedListId === "myday" && !searchQuery && (
              <section className="border-t border-border pt-8 space-y-4">
                <button type="button" onClick={() => setShowRecurring(!showRecurring)} className="flex items-center justify-between w-full text-left">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Weekday Recurring Tasks</h3>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showRecurring && "rotate-180")} />
                </button>
                {showRecurring && (
                  <div className="space-y-4">
                    <EnhancedTaskForm onAdd={addRecurringTask} placeholder="Add a recurring task..." currentListId={selectedListId} allLists={allListOptions} />
                    {recurringTasks.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">No recurring tasks.</p>
                    ) : (
                      <div className="space-y-2">
                        {recurringTasks.map((task) => <RecurringTaskItem key={task.id} task={task} onToggleDay={toggleRecurringDay} onDelete={deleteRecurringTask} />)}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {selectedListId === "myday" && !searchQuery && <Manifesto />}
            <footer className="text-center text-xs text-muted-foreground pt-8 pb-4"><p>Add to home screen for the best experience</p></footer>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onToggleComplete={() => toggleTodo(selectedTask.id)}
          onToggleImportant={() => toggleImportant(selectedTask.id)}
          onToggleMyDay={() => toggleMyDay(selectedTask.id)}
          onUpdate={(updates) => updateTask(selectedTask.id, updates)}
          onDelete={() => deleteTodo(selectedTask.id)}
          onAddStep={(title) => addStep(selectedTask.id, title)}
          onToggleStepComplete={(stepId) => toggleStepComplete(selectedTask.id, stepId)}
          onDeleteStep={(stepId) => deleteStep(selectedTask.id, stepId)}
        />
      )}

      <PauseModal isOpen={showPauseModal} onSelect={handlePauseSelect} onCancel={() => setShowPauseModal(false)} />
      <SetTimeModal isOpen={showSetTimeModal} onSet={handleSetTime} onCancel={() => setShowSetTimeModal(false)} />
      <SyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} onSync={handleSyncData} getCurrentData={getCurrentData} />
    </div>
  )
}
