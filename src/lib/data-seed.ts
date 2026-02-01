// =============================================================================
// Data Seed - All tasks from master-todo artifact converted to SON format
// Loaded on first launch when localStorage is empty
// =============================================================================

import type { TaskStep } from "@/components/task-detail-panel"

// Extended TaskList with bucket grouping
export interface BucketGroup {
  id: string
  name: string
  icon: string
  color: string
  bucketId: string
}

export interface Bucket {
  id: string
  name: string
  icon: string
  accent: string
  groupOrder: string[] // list IDs in order
}

export interface SeedTodo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  dateKey: string
  important: boolean
  myDay: boolean
  dueDate: string | null
  dueLabel: string | null
  steps: TaskStep[]
  notes: string
  listId: string
  bucketId: string
  starred: boolean
  link: string | null
  hasFiles: boolean
  hasNote: boolean
  recurring: string | null
  reminder: string | null
}

// =============================================================================
// Buckets (top-level groupings)
// =============================================================================

export const SEED_BUCKETS: Bucket[] = [
  { id: "2103", name: "2103", icon: "🏠", accent: "#E8A87C", groupOrder: ["2103-cleaning", "2103-someday", "2103-lumber", "2103-measurements", "2103-neighbors", "2103-research", "2103-services", "2103-supplies", "2103-tasks", "2103-tools"] },
  { id: "personal", name: "PERSONAL", icon: "👤", accent: "#6CB4EE", groupOrder: ["personal-tasks", "personal-important", "personal-hotyoga"] },
  { id: "rhl", name: "RHL", icon: "🏢", accent: "#4ECDC4", groupOrder: ["rhl-etal"] },
  { id: "richre", name: "RICH RE", icon: "🏘️", accent: "#FF6B6B", groupOrder: ["richre-tasks"] },
  { id: "revente", name: "REVENTE", icon: "💰", accent: "#F7DC6F", groupOrder: ["revente-inventory", "revente-completed"] },
]

// =============================================================================
// Custom Lists (groups within buckets)
// =============================================================================

export const SEED_LISTS: BucketGroup[] = [
  // 2103
  { id: "2103-cleaning", name: "Cleaning", icon: "🧹", color: "#E8A87C", bucketId: "2103" },
  { id: "2103-someday", name: "Some Day", icon: "📋", color: "#85CDCA", bucketId: "2103" },
  { id: "2103-lumber", name: "Lumber", icon: "🪵", color: "#D4A574", bucketId: "2103" },
  { id: "2103-measurements", name: "Measurements", icon: "📏", color: "#7FB5B5", bucketId: "2103" },
  { id: "2103-neighbors", name: "Neighbors", icon: "🏘️", color: "#B5CADA", bucketId: "2103" },
  { id: "2103-research", name: "Research", icon: "🔍", color: "#C3A6D8", bucketId: "2103" },
  { id: "2103-services", name: "Services", icon: "🔧", color: "#F0B67F", bucketId: "2103" },
  { id: "2103-supplies", name: "Supplies - Parts", icon: "🔩", color: "#E8B4B8", bucketId: "2103" },
  { id: "2103-tasks", name: "Tasks", icon: "✅", color: "#A8D8EA", bucketId: "2103" },
  { id: "2103-tools", name: "Tools", icon: "🛠️", color: "#AA96DA", bucketId: "2103" },
  // PERSONAL
  { id: "personal-tasks", name: "Tasks", icon: "📝", color: "#6CB4EE", bucketId: "personal" },
  { id: "personal-important", name: "Important", icon: "⭐", color: "#FFD700", bucketId: "personal" },
  { id: "personal-hotyoga", name: "Hot Yoga Guide", icon: "🧘", color: "#FF7F6B", bucketId: "personal" },
  // RHL
  { id: "rhl-etal", name: "RHL ET AL", icon: "📊", color: "#4ECDC4", bucketId: "rhl" },
  // RICH RE
  { id: "richre-tasks", name: "Tasks", icon: "📝", color: "#FF6B6B", bucketId: "richre" },
  // REVENTE
  { id: "revente-inventory", name: "Inventory", icon: "📦", color: "#F7DC6F", bucketId: "revente" },
  { id: "revente-completed", name: "Completed", icon: "✅", color: "#82E0AA", bucketId: "revente" },
]

// =============================================================================
// Helper to parse "Wed, Feb 18" style dates into YYYY-MM-DD
// =============================================================================

function parseDueLabel(label: string | undefined): string | null {
  if (!label) return null
  const l = label.trim()
  if (l === "Today") return new Date().toISOString().split("T")[0]
  if (l === "Tomorrow") {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }
  // Parse "Day, Mon DD" or "Day, Mon DD, YYYY"
  const parts = l.replace(/^[A-Za-z]+,\s*/, "").trim()
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const match = parts.match(/^(\w+)\s+(\d+)(?:,\s*(\d{4}))?$/)
  if (!match) return null
  const month = months[match[1]]
  if (month === undefined) return null
  const day = parseInt(match[2])
  const year = match[3] ? parseInt(match[3]) : new Date().getFullYear()
  const d = new Date(year, month, day)
  return d.toISOString().split("T")[0]
}

// =============================================================================
// Convert subtasks to TaskStep[]
// =============================================================================

function toSteps(subtasks?: Array<{ id: string; text: string; done: boolean }>): TaskStep[] {
  if (!subtasks?.length) return []
  return subtasks.map(s => ({
    id: s.id,
    title: s.text,
    completed: s.done,
  }))
}

// =============================================================================
// Build seed todos
// =============================================================================

const now = Date.now()
const todayKey = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
})()

interface RawTask {
  id: string
  text: string
  done: boolean
  due?: string
  dueISO?: string
  starred?: boolean
  link?: string
  note?: boolean
  files?: boolean
  recurring?: string
  subtasks?: Array<{ id: string; text: string; done: boolean }>
}

function buildTodos(listId: string, bucketId: string, items: RawTask[]): SeedTodo[] {
  return items.map((item, idx) => ({
    id: item.id,
    text: item.text,
    completed: item.done,
    createdAt: now - (items.length - idx) * 1000,
    dateKey: todayKey,
    important: item.starred ?? false,
    myDay: false,
    dueDate: item.dueISO ?? parseDueLabel(item.due),
    dueLabel: item.due ?? null,
    steps: toSteps(item.subtasks),
    notes: "",
    listId,
    bucketId,
    starred: item.starred ?? false,
    link: item.link ?? null,
    hasFiles: item.files ?? false,
    hasNote: item.note ?? false,
    recurring: item.recurring ?? null,
    reminder: null,
  }))
}

// =============================================================================
// ALL TASKS - Sample starter tasks (reduced for performance)
// =============================================================================

export const SEED_TODOS: SeedTodo[] = [
  // --- 2103 > Cleaning ---
  ...buildTodos("2103-cleaning", "2103", [
    { id: "c1", text: "Toilet bowls rust remover", done: false },
    { id: "c2", text: "Clean stove faces and stainless steel", done: false },
    { id: "c3", text: "Bleach Guest bathroom grout", done: false },
    { id: "c4", text: "Wipe down inner door washer dryer", done: false },
    { id: "c5", text: "Clean Garage Walls", done: false },
  ]),

  // --- 2103 > Some Day ---
  ...buildTodos("2103-someday", "2103", [
    { id: "sd1", text: "Back fill around foundation", done: false },
    { id: "sd2", text: "Marble Counter Tops", done: false },
    { id: "sd3", text: "Window replacement", done: false, note: true },
    { id: "sd4", text: "Bury downspout tile", done: false, files: true },
    { id: "sd5", text: "Small retaining wall", done: false, files: true },
  ]),

  // --- 2103 > Measurements ---
  ...buildTodos("2103-measurements", "2103", [
    { id: "m1", text: 'SINK: inner 33" x 22" | Outer 33.875" x 22.625"', done: false },
    { id: "m2", text: 'Front porch trim .75"x3.5"', done: false },
    { id: "m3", text: "Trim frame 3.625 x 3.375", done: false },
  ]),

  // --- 2103 > Research ---
  ...buildTodos("2103-research", "2103", [
    { id: "r1", text: "Window replacement", done: false },
    { id: "r2", text: "Sink replacement research", done: false },
    { id: "r3", text: "Research Carpenter Ant Poison", done: false },
  ]),

  // --- 2103 > Services ---
  ...buildTodos("2103-services", "2103", [
    { id: "sv1", text: "Frank Slocum Handyman Work", done: false },
    { id: "sv2", text: "Sod", done: false },
    { id: "sv3", text: "Interior painter", done: false },
    { id: "sv4", text: "Landscaping", done: false },
  ]),

  // --- 2103 > Supplies - Parts ---
  ...buildTodos("2103-supplies", "2103", [
    { id: "sp1", text: "Dimmer switch Tuckers rm", done: false },
    { id: "sp2", text: "Half bath exhaust fan", done: false },
    {
      id: "sp3", text: "Grill Parts", done: false,
      subtasks: [
        { id: "sp3a", text: "Determine parts needed", done: false },
        { id: "sp3b", text: "Order parts", done: false },
        { id: "sp3c", text: "Unassemble", done: false },
        { id: "sp3d", text: "Clean", done: false },
        { id: "sp3e", text: "Assemble", done: false },
      ],
    },
  ]),

  // --- 2103 > Tools ---
  ...buildTodos("2103-tools", "2103", [
    { id: "t1", text: "Grout removal tool", done: false },
    { id: "t2", text: "3M Masking tape blade", done: false },
    { id: "t3", text: "Drywall sander", done: false, link: "https://is.gd/ttxsq0" },
    { id: "t4", text: "Electric Power washer", done: false },
  ]),

  // --- PERSONAL > Tasks ---
  ...buildTodos("personal-tasks", "personal", [
    {
      id: "pt2", text: "AM mat exercises", done: false, due: "Today", starred: true,
      subtasks: [
        { id: "pt2a", text: "Hooklying Clamshell resistance", done: false },
        { id: "pt2b", text: "Bridge w/hip abduction", done: false },
        { id: "pt2c", text: "Steeple twist", done: false },
        { id: "pt2d", text: "Bird dog", done: false },
        { id: "pt2e", text: "Roller", done: false },
        { id: "pt2f", text: "Hip Circles", done: false },
      ],
    },
    { id: "pt3", text: "Scan Docs Receipts", done: false, recurring: "weekly" },
    { id: "pt6", text: "Pack suitcase for KC", done: false, due: "Today" },
    { id: "pt7", text: "Update Upon my Death Instructions", done: false, due: "Today" },
    { id: "pt9", text: "Vitamin Refill", done: false },
    { id: "pt10", text: "Walmart Run", done: false },
    { id: "pt11", text: "Trash recycling", done: false },
    { id: "pt13", text: "Empty Trash", done: false },
    { id: "pt25", text: "Clean vacuum cleaner", done: false },
    { id: "pt35", text: "Scan Docs Receipts", done: false },
    { id: "pt36", text: "Organize Gym Bag CAC", done: false },
    { id: "pt41", text: "GMAIL", done: false },
    { id: "pt47", text: "Clear/Archive daily text voicemail messages", done: false },
    { id: "pt48", text: "Review Calendar for upcoming appointments", done: false },
    { id: "pt49", text: "Target/Walmart Run", done: false },
    { id: "pt50", text: "Shred papers", done: false },
    { id: "pt51", text: "FOOD & SUPPLIES INVENTORY", done: false },
    { id: "pt64", text: "10min organization/sort/trash", done: false },
    { id: "pt69", text: "Gmail Snooze Items", done: false, starred: true },
  ]),

  // --- PERSONAL > Important ---
  ...buildTodos("personal-important", "personal", [
    {
      id: "imp1", text: "26 Bikram sequence", done: false, starred: true,
      subtasks: [{ id: "imp1a", text: "YouTube reference video", done: false }],
    },
  ]),

  // --- PERSONAL > Hot Yoga Guide ---
  ...buildTodos("personal-hotyoga", "personal", [
    { id: "hy1", text: "Standing Deep Breathing (Pranayama)", done: false },
    { id: "hy2", text: "Half Moon Pose (Ardha Chandrasana)", done: false },
    { id: "hy3", text: "Awkward Pose (Utkatasana)", done: false },
    { id: "hy4", text: "Eagle Pose (Garudasana)", done: false },
    { id: "hy5", text: "Standing Head to Knee", done: false },
    { id: "hy6", text: "Standing Bow Pulling", done: false },
    { id: "hy7", text: "Balancing Stick (Tuladandasana)", done: false },
    { id: "hy8", text: "Standing Separate Leg Stretching", done: false },
    { id: "hy9", text: "Triangle Pose (Trikonasana)", done: false },
    { id: "hy10", text: "Standing Separate Leg Head to Knee", done: false },
    { id: "hy11", text: "Tree Pose (Tadasana)", done: false },
    { id: "hy12", text: "Toe Stand (Padangustasana)", done: false },
  ]),

  // --- RHL > RHL ET AL ---
  ...buildTodos("rhl-etal", "rhl", [
    { id: "rhl2", text: "RHL Google One", done: false },
    { id: "rhl3", text: "IRS Payment", done: false },
    { id: "rhl4", text: "Change PF broker comp", done: false },
  ]),

  // --- RICH RE > Tasks ---
  ...buildTodos("richre-tasks", "richre", [
    { id: "re1", text: "Are AI real estate agents the future for homebuyers?", done: false, link: "https://www.housingwire.com/?p=478283" },
    { id: "re2", text: "LINCOLN ASSET", done: false, note: true },
    { id: "re3", text: "Lincoln Asset Mgmt", done: false },
  ]),

  // --- REVENTE > Inventory ---
  ...buildTodos("revente-inventory", "revente", [
    { id: "rv1", text: "2x Honeywell TH4110D1007 Programmable Thermostat", done: false },
    { id: "rv2", text: "$175 Google Pixel 7", done: false },
    { id: "rv3", text: '$50 HP ProBook 4540s 15.6" Laptop', done: false },
    { id: "rv4", text: "US $149.99 Ledger - Nano Gen 5", done: false },
  ]),

  // --- REVENTE > Completed ---
  ...buildTodos("revente-completed", "revente", [
    { id: "rvc1", text: "Organize and List Items", done: true },
  ]),
]
