import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import {
  generateSyncCode,
  hashPin,
  generateSessionToken,
  type SyncedData,
} from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin, existingData } = body as {
      pin: string
      existingData?: {
        todos: unknown[]
        recurringTasks: unknown[]
        pauseLogs: unknown[]
        timerState: unknown
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
    const sessionToken = generateSessionToken()
    const now = Date.now()

    // Create synced data structure
    const syncedData: SyncedData = {
      syncCode,
      pinHash,
      salt,
      createdAt: now,
      lastSyncedAt: now,
      todos: (existingData?.todos || []).map((t: any) => ({
        ...t,
        updatedAt: t.updatedAt || now,
      })),
      recurringTasks: (existingData?.recurringTasks || []).map((t: any) => ({
        ...t,
        createdAt: t.createdAt || now,
        updatedAt: t.updatedAt || now,
      })),
      pauseLogs: (existingData?.pauseLogs || []) as SyncedData['pauseLogs'],
      timerState: existingData?.timerState
        ? { ...(existingData.timerState as any), updatedAt: now }
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
      sessionToken,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to create sync account' },
      { status: 500 }
    )
  }
}
