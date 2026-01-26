// Sync utilities for PIN-based authentication and data management

// Generate a random sync code like "SIGNAL-A1B2C3"
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars (0,O,1,I)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `SIGNAL-${code}`
}

// Hash PIN using SHA-256 (works in browser and Node)
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Verify PIN against stored hash (timing-safe)
export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, salt)
  return constantTimeCompare(hash, storedHash)
}

// Generate auth token from sync code + salt (for API auth)
export async function generateAuthToken(syncCode: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(syncCode + salt + 'auth')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verify auth token
export async function verifyAuthToken(token: string, syncCode: string, salt: string): Promise<boolean> {
  const expectedToken = await generateAuthToken(syncCode, salt)
  return constantTimeCompare(token, expectedToken)
}

// Types for synced data
export interface SyncedData {
  // Auth metadata
  syncCode: string
  pinHash: string
  salt: string
  createdAt: number
  lastSyncedAt: number

  // User data
  todos: SyncedTodo[]
  recurringTasks: SyncedRecurringTask[]
  pauseLogs: SyncedPauseLog[]
  timerState: SyncedTimerState | null
  recurringAddedDates: string[]
}

export interface SyncedTodo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  dateKey: string
  updatedAt: number
}

export interface SyncedRecurringTask {
  id: string
  text: string
  weekdays: number[]
  createdAt: number
  updatedAt: number
}

export interface SyncedPauseLog {
  id: string
  reason: string
  startTime: number
  endTime: number | null
  duration: number
  dateKey: string
}

export interface SyncedTimerState {
  startTime: number | null
  pausedAt: number | null
  totalPausedTime: number
  isPaused: boolean
  dateKey: string | null
  updatedAt: number
}

// Client-side sync state stored in localStorage
export interface LocalSyncState {
  syncCode: string
  authToken: string // Token for API auth (derived from syncCode + salt)
  lastSyncedAt: number
}

const SYNC_STATE_KEY = 'signal-over-noise-sync-state'

export function getLocalSyncState(): LocalSyncState | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(SYNC_STATE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function setLocalSyncState(state: LocalSyncState | null): void {
  if (typeof window === 'undefined') return
  if (state) {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
  } else {
    localStorage.removeItem(SYNC_STATE_KEY)
  }
}
