import { NextRequest, NextResponse } from 'next/server'
import { list, put } from '@vercel/blob'
import { verifyAuthToken, type SyncedData } from '@/lib/sync'

// GET - Fetch synced data
export async function GET(request: NextRequest) {
  try {
    const syncCode = request.headers.get('x-sync-code')

    if (!syncCode) {
      return NextResponse.json(
        { error: 'Sync code required' },
        { status: 400 }
      )
    }

    // Normalize sync code
    let normalizedCode = syncCode.toUpperCase().trim()
    if (!normalizedCode.startsWith('SIGNAL-')) {
      normalizedCode = `SIGNAL-${normalizedCode}`
    }

    // Find the blob
    const { blobs } = await list({ prefix: `sync/${normalizedCode}.json` })

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Sync data not found' },
        { status: 404 }
      )
    }

    // Fetch the data
    const response = await fetch(blobs[0].url)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sync data' },
        { status: 500 }
      )
    }

    const syncedData: SyncedData = await response.json()

    // Return data without sensitive fields
    return NextResponse.json({
      todos: syncedData.todos,
      recurringTasks: syncedData.recurringTasks,
      pauseLogs: syncedData.pauseLogs,
      timerState: syncedData.timerState,
      recurringAddedDates: syncedData.recurringAddedDates,
      lastSyncedAt: syncedData.lastSyncedAt,
    })
  } catch (error) {
    console.error('Sync GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync data' },
      { status: 500 }
    )
  }
}

// POST - Update synced data
export async function POST(request: NextRequest) {
  try {
    const syncCode = request.headers.get('x-sync-code')
    const authToken = request.headers.get('x-auth-token')

    if (!syncCode) {
      return NextResponse.json(
        { error: 'Sync code required' },
        { status: 400 }
      )
    }

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Normalize sync code
    let normalizedCode = syncCode.toUpperCase().trim()
    if (!normalizedCode.startsWith('SIGNAL-')) {
      normalizedCode = `SIGNAL-${normalizedCode}`
    }

    // Find the existing blob
    const { blobs } = await list({ prefix: `sync/${normalizedCode}.json` })

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Sync data not found' },
        { status: 404 }
      )
    }

    // Fetch existing data to preserve auth info
    const existingResponse = await fetch(blobs[0].url)
    if (!existingResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch existing sync data' },
        { status: 500 }
      )
    }

    const existingData: SyncedData = await existingResponse.json()

    // Verify auth token
    const isValidToken = await verifyAuthToken(authToken, normalizedCode, existingData.salt)
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get new data from request
    const body = await request.json()
    const { todos, recurringTasks, pauseLogs, timerState, recurringAddedDates } = body

    const now = Date.now()

    // Merge data - preserve auth, update user data
    const updatedData: SyncedData = {
      // Preserve auth info
      syncCode: existingData.syncCode,
      pinHash: existingData.pinHash,
      salt: existingData.salt,
      createdAt: existingData.createdAt,
      lastSyncedAt: now,

      // Update user data
      todos: todos || existingData.todos,
      recurringTasks: recurringTasks || existingData.recurringTasks,
      pauseLogs: pauseLogs || existingData.pauseLogs,
      timerState: timerState !== undefined ? timerState : existingData.timerState,
      recurringAddedDates: recurringAddedDates || existingData.recurringAddedDates,
    }

    // Save updated data
    await put(`sync/${normalizedCode}.json`, JSON.stringify(updatedData), {
      access: 'public',
      contentType: 'application/json',
    })

    return NextResponse.json({
      success: true,
      lastSyncedAt: now,
    })
  } catch (error) {
    console.error('Sync POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save sync data' },
      { status: 500 }
    )
  }
}
