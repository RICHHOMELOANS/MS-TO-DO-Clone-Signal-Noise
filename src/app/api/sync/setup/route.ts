import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import {
  generateSyncCode,
  hashPin,
  generateAuthToken,
  type SyncedData,
  type SyncedTodo,
  type SyncedRecurringTask,
  type SyncedTimerState,
  type SyncedPauseLog,
} from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, existingData } = body as {
      pin: string
      existingData?: {
        todos: Partial<SyncedTodo>[]
        recurringTasks: Partial<SyncedRecurringTask>[]
        pauseLogs: SyncedPauseLog[]
        timerState: Partial<SyncedTimerState> | null
        recurringAddedDates: string[]
      }
    }

    // Validate PIN (4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      )
    }

    // Generate unique sync code (retry if collision)
    let syncCode: string
    let attempts = 0
    const maxAttempts = 10

    do {
      syncCode = generateSyncCode()
      attempts++

      // Check if sync code already exists
      try {
        const existing = await head(`sync/${syncCode}.json`)
        if (!existing) break // Code is available
      } catch {
        break // Code is available (404)
      }
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique sync code' },
        { status: 500 }
      )
    }

    // Generate salt and hash PIN
    const salt = crypto.randomUUID()
    const pinHash = await hashPin(pin, salt)
    const authToken = await generateAuthToken(syncCode, salt)
    const now = Date.now()

    // Create synced data structure
    const syncedData: SyncedData = {
      syncCode,
      pinHash,
      salt,
      createdAt: now,
      lastSyncedAt: now,
      todos: (existingData?.todos || []).map((t) => ({
        id: t.id || crypto.randomUUID(),
        text: t.text || '',
        completed: t.completed || false,
        createdAt: t.createdAt || now,
        dateKey: t.dateKey || '',
        updatedAt: t.updatedAt || now,
      })),
      recurringTasks: (existingData?.recurringTasks || []).map((t) => ({
        id: t.id || crypto.randomUUID(),
        text: t.text || '',
        weekdays: t.weekdays || [],
        createdAt: t.createdAt || now,
        updatedAt: t.updatedAt || now,
      })),
      pauseLogs: existingData?.pauseLogs || [],
      timerState: existingData?.timerState
        ? {
            startTime: existingData.timerState.startTime ?? null,
            pausedAt: existingData.timerState.pausedAt ?? null,
            totalPausedTime: existingData.timerState.totalPausedTime || 0,
            isPaused: existingData.timerState.isPaused || false,
            dateKey: existingData.timerState.dateKey ?? null,
            updatedAt: now,
          }
        : null,
      recurringAddedDates: existingData?.recurringAddedDates || [],
    }

    // Store in Vercel Blob
    await put(`sync/${syncCode}.json`, JSON.stringify(syncedData), {
      access: 'public',
      contentType: 'application/json',
    })

    return NextResponse.json({
      success: true,
      syncCode,
      authToken,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to create sync account' },
      { status: 500 }
    )
  }
}
