"use client"

import * as React from "react"
import { Cloud, CloudOff, Copy, Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getLocalSyncState,
  setLocalSyncState,
  type LocalSyncState,
} from "@/lib/sync"

type SyncMode = "idle" | "setup" | "login" | "synced"

interface SyncModalProps {
  isOpen: boolean
  onClose: () => void
  onSync: (syncState: LocalSyncState, data: any) => void
  getCurrentData: () => {
    todos: any[]
    recurringTasks: any[]
    pauseLogs: any[]
    timerState: any
    recurringAddedDates: string[]
  }
}

export function SyncModal({ isOpen, onClose, onSync, getCurrentData }: SyncModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState<SyncMode>("idle")
  const [pin, setPin] = React.useState("")
  const [syncCode, setSyncCode] = React.useState("")
  const [generatedCode, setGeneratedCode] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Check for existing sync state on mount
  React.useEffect(() => {
    const existingState = getLocalSyncState()
    if (existingState) {
      setMode("synced")
      setGeneratedCode(existingState.syncCode)
    }
  }, [isOpen])

  // ESC key and focus trap
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const handleSetup = async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits")
      return
    }

    setLoading(true)
    setError("")

    try {
      const existingData = getCurrentData()

      const response = await fetch("/api/sync/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, existingData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Setup failed")
      }

      // Save sync state
      const syncState: LocalSyncState = {
        syncCode: data.syncCode,
        authToken: data.authToken,
        lastSyncedAt: Date.now(),
      }
      setLocalSyncState(syncState)

      setGeneratedCode(data.syncCode)
      setMode("synced")
      onSync(syncState, existingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits")
      return
    }

    if (!syncCode.trim()) {
      setError("Enter your sync code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/sync/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncCode, pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      // Save sync state
      const syncState: LocalSyncState = {
        syncCode: data.syncCode,
        authToken: data.authToken,
        lastSyncedAt: data.data.lastSyncedAt,
      }
      setLocalSyncState(syncState)

      setGeneratedCode(data.syncCode)
      setMode("synced")
      onSync(syncState, data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    setLocalSyncState(null)
    setMode("idle")
    setPin("")
    setSyncCode("")
    setGeneratedCode("")
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = generatedCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="sync-modal-title" className="text-lg font-semibold flex items-center gap-2">
            {mode === "synced" ? <Cloud className="w-5 h-5 text-green-500" /> : <CloudOff className="w-5 h-5" />}
            Sync Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              Sync your tasks across devices with a PIN code.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode("setup")}
                className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Set up new sync</div>
                <div className="text-sm text-muted-foreground">Create a sync code for this device</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full p-3 text-left rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="font-medium">Connect existing sync</div>
                <div className="text-sm text-muted-foreground">Enter code from another device</div>
              </button>
            </div>
          </>
        )}

        {mode === "setup" && (
          <>
            <p className="text-sm text-muted-foreground">
              Create a 4-digit PIN to secure your sync.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                  setPin(value)
                  setError("")
                }}
                className="w-full bg-background border border-border h-12 px-4 rounded-md text-center text-2xl tracking-[0.5em] font-mono placeholder:text-sm placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                onClick={handleSetup}
                disabled={loading || pin.length !== 4}
                className="w-full h-12 bg-accent text-accent-foreground rounded-md font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Sync
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("idle")
                  setPin("")
                  setError("")
                }}
                className="w-full p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}

        {mode === "login" && (
          <>
            <p className="text-sm text-muted-foreground">
              Enter your sync code and PIN from another device.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="SIGNAL-XXXXXX"
                value={syncCode}
                onChange={(e) => {
                  setSyncCode(e.target.value.toUpperCase())
                  setError("")
                }}
                className="w-full bg-background border border-border h-12 px-4 rounded-md text-center font-mono uppercase tracking-wider placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                  setPin(value)
                  setError("")
                }}
                className="w-full bg-background border border-border h-12 px-4 rounded-md text-center text-2xl tracking-[0.5em] font-mono placeholder:text-sm placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading || pin.length !== 4 || !syncCode.trim()}
                className="w-full h-12 bg-accent text-accent-foreground rounded-md font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("idle")
                  setPin("")
                  setSyncCode("")
                  setError("")
                }}
                className="w-full p-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}

        {mode === "synced" && (
          <>
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Check className="w-4 h-4" />
              Sync enabled
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Your sync code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-lg tracking-wider">{generatedCode}</code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                    aria-label="Copy sync code"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this code and your PIN to sync on other devices.
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full p-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                Disconnect sync
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Sync button component for the header
interface SyncButtonProps {
  onClick: () => void
  isSynced: boolean
  isSyncing: boolean
  syncError?: string | null
}

export function SyncButton({ onClick, isSynced, isSyncing, syncError }: SyncButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md size-9 transition-colors relative",
        syncError
          ? "text-destructive hover:text-destructive/80"
          : isSynced
          ? "text-green-500 hover:text-green-400"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
      aria-label={syncError ? `Sync error: ${syncError}` : isSynced ? "Sync enabled" : "Enable sync"}
      title={syncError ? `Sync error: ${syncError}` : undefined}
    >
      {isSyncing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : syncError ? (
        <CloudOff className="w-5 h-5" />
      ) : isSynced ? (
        <Cloud className="w-5 h-5" />
      ) : (
        <CloudOff className="w-5 h-5" />
      )}
      {syncError && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
      )}
    </button>
  )
}
