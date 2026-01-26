import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'
import {
  verifyPin,
  generateAuthToken,
  type SyncedData,
} from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { syncCode, pin } = body as { syncCode: string; pin: string }

    // Validate inputs
    if (!syncCode || !pin) {
      return NextResponse.json(
        { error: 'Sync code and PIN are required' },
        { status: 400 }
      )
    }

    // Normalize sync code (uppercase, add prefix if missing)
    let normalizedCode = syncCode.toUpperCase().trim()
    if (!normalizedCode.startsWith('SIGNAL-')) {
      normalizedCode = `SIGNAL-${normalizedCode}`
    }

    // Fetch the blob
    const blobUrl = `${process.env.BLOB_READ_WRITE_TOKEN ? '' : 'https://'}sync/${normalizedCode}.json`

    // List blobs to find the one we need
    const { blobs } = await list({ prefix: `sync/${normalizedCode}.json` })

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Sync code not found' },
        { status: 404 }
      )
    }

    // Fetch the data
    const response = await fetch(blobs[0].url)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Sync code not found' },
        { status: 404 }
      )
    }

    const syncedData: SyncedData = await response.json()

    // Verify PIN
    const isValid = await verifyPin(pin, syncedData.salt, syncedData.pinHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Generate auth token (derived from syncCode + salt)
    const authToken = await generateAuthToken(normalizedCode, syncedData.salt)

    // Return success with data
    return NextResponse.json({
      success: true,
      syncCode: normalizedCode,
      authToken,
      data: {
        todos: syncedData.todos,
        recurringTasks: syncedData.recurringTasks,
        pauseLogs: syncedData.pauseLogs,
        timerState: syncedData.timerState,
        recurringAddedDates: syncedData.recurringAddedDates,
        lastSyncedAt: syncedData.lastSyncedAt,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
