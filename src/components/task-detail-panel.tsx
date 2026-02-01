"use client"

import * as React from "react"
import { Sun, Star, Calendar, Plus, Check, ChevronRight, Trash2, Bell, X, Link2, RotateCcw, FileText, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TaskStep {
  id: string
  title: string
  completed: boolean
}

export interface EnhancedTodo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  dateKey: string
  important: boolean
  myDay: boolean
  dueDate: string | null
  steps: TaskStep[]
  notes: string
  listId: string
  // Extended fields from master-todo
  bucketId?: string
  starred?: boolean
  link?: string | null
  hasFiles?: boolean
  hasNote?: boolean
  recurring?: string | null
  reminder?: string | null
}

interface TaskDetailPanelProps {
  task: EnhancedTodo
  onClose: () => void
  onToggleComplete: () => void
  onToggleImportant: () => void
  onToggleMyDay: () => void
  onUpdate: (updates: Partial<EnhancedTodo>) => void
  onDelete: () => void
  onAddStep: (title: string) => void
  onToggleStepComplete: (stepId: string) => void
  onDeleteStep: (stepId: string) => void
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)

  const todayStr = today.toISOString().split("T")[0]
  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  if (dateStr === todayStr) return "Today"
  if (dateStr === tomorrowStr) return "Tomorrow"

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toISOString().split("T")[0])
}

const RECUR_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
]

const REMINDER_OPTIONS = [
  "Later today",
  "Tomorrow morning",
  "Tomorrow afternoon",
  "Next week",
]

export function TaskDetailPanel({
  task,
  onClose,
  onToggleComplete,
  onToggleImportant,
  onToggleMyDay,
  onUpdate,
  onDelete,
  onAddStep,
  onToggleStepComplete,
  onDeleteStep,
}: TaskDetailPanelProps) {
  const [newStepTitle, setNewStepTitle] = React.useState("")
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [editedTitle, setEditedTitle] = React.useState(task.text)
  const [showRecurPicker, setShowRecurPicker] = React.useState(false)
  const [showReminderPicker, setShowReminderPicker] = React.useState(false)
  const [editingLink, setEditingLink] = React.useState(false)
  const [linkValue, setLinkValue] = React.useState(task.link || "")

  React.useEffect(() => {
    setEditedTitle(task.text)
    setLinkValue(task.link || "")
  }, [task.text, task.link])

  const handleTitleSave = React.useCallback(() => {
    if (editedTitle.trim()) {
      onUpdate({ text: editedTitle })
    }
    setIsEditingTitle(false)
  }, [editedTitle, onUpdate])

  const handleAddStep = React.useCallback(() => {
    if (newStepTitle.trim()) {
      onAddStep(newStepTitle)
      setNewStepTitle("")
    }
  }, [newStepTitle, onAddStep])

  const handleLinkSave = React.useCallback(() => {
    onUpdate({ link: linkValue.trim() || null })
    setEditingLink(false)
  }, [linkValue, onUpdate])

  const dueDateLabel = formatDueDate(task.dueDate)
  const overdue = task.dueDate && !task.completed && isOverdue(task.dueDate)
  const isStarred = task.important || task.starred

  return (
    <div className="w-80 bg-secondary/30 border-l border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            type="button"
            onClick={onToggleComplete}
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 shrink-0",
              task.completed
                ? "bg-primary border-primary"
                : "border-muted-foreground hover:border-primary"
            )}
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          >
            {task.completed && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                className="w-full font-medium focus:outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsEditingTitle(true)}
                onKeyDown={(e) => { if (e.key === "Enter") setIsEditingTitle(true) }}
                className={cn(
                  "font-medium cursor-text",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.text}
              </div>
            )}
          </div>

          {/* Star */}
          <button
            type="button"
            onClick={onToggleImportant}
            className="p-1 hover:bg-accent rounded transition-colors shrink-0"
            aria-label={isStarred ? "Remove from important" : "Mark as important"}
          >
            <Star
              size={18}
              className={cn(
                isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Steps */}
        <div className="p-4 border-b border-border">
          <div className="space-y-2">
            {task.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 group">
                <button
                  type="button"
                  onClick={() => onToggleStepComplete(step.id)}
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                    step.completed
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  )}
                  aria-label={step.completed ? "Mark step incomplete" : "Mark step complete"}
                >
                  {step.completed && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                </button>
                <span className={cn("text-sm flex-1", step.completed && "line-through text-muted-foreground")}>
                  {step.title}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                  aria-label={`Delete step: ${step.title}`}
                >
                  <X size={12} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Step */}
          <div className="flex items-center gap-3 mt-3">
            <Plus size={16} className="text-primary" />
            <input
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
              placeholder="Add step"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* My Day */}
        <button
          type="button"
          onClick={onToggleMyDay}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border"
        >
          <Sun size={18} className={task.myDay ? "text-primary" : "text-muted-foreground"} />
          <span className={cn("text-sm", task.myDay && "text-primary")}>
            {task.myDay ? "Added to My Day" : "Add to My Day"}
          </span>
        </button>

        {/* Reminder */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setShowReminderPicker(!showReminderPicker)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <Bell size={18} className={task.reminder ? "text-blue-400" : "text-muted-foreground"} />
            <span className={cn("text-sm flex-1 text-left", task.reminder && "text-blue-400")}>
              {task.reminder || "Remind me"}
            </span>
            {task.reminder && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpdate({ reminder: null }) }}
                className="p-1 hover:bg-accent rounded"
                aria-label="Clear reminder"
              >
                <X size={12} className="text-muted-foreground" />
              </button>
            )}
          </button>
          {showReminderPicker && (
            <div className="px-4 pb-3 space-y-1">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => { onUpdate({ reminder: opt }); setShowReminderPicker(false) }}
                  className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-accent/50 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Calendar size={18} className={overdue ? "text-destructive" : "text-muted-foreground"} />
            <input
              type="date"
              value={task.dueDate || ""}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
          </div>
          {task.dueDate && (
            <div className={cn("ml-8 text-xs mt-1", overdue ? "text-destructive" : "text-muted-foreground")}>
              {overdue ? "Overdue - " : "Due "}{dueDateLabel}
            </div>
          )}
        </div>

        {/* Recurring */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setShowRecurPicker(!showRecurPicker)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <RotateCcw size={18} className={task.recurring ? "text-green-400" : "text-muted-foreground"} />
            <span className={cn("text-sm flex-1 text-left", task.recurring && "text-green-400")}>
              {task.recurring || "Repeat"}
            </span>
            {task.recurring && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpdate({ recurring: null }) }}
                className="p-1 hover:bg-accent rounded"
                aria-label="Clear recurring"
              >
                <X size={12} className="text-muted-foreground" />
              </button>
            )}
          </button>
          {showRecurPicker && (
            <div className="px-4 pb-3 space-y-1">
              {RECUR_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => { onUpdate({ recurring: opt.label.toLowerCase() }); setShowRecurPicker(false) }}
                  className={cn(
                    "w-full text-left text-sm px-3 py-1.5 rounded hover:bg-accent/50 transition-colors",
                    task.recurring === opt.label.toLowerCase() && "bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Link2 size={18} className={task.link ? "text-blue-400" : "text-muted-foreground"} />
            {editingLink ? (
              <input
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onBlur={handleLinkSave}
                onKeyDown={(e) => e.key === "Enter" && handleLinkSave()}
                placeholder="https://..."
                className="flex-1 text-sm bg-transparent focus:outline-none"
                autoFocus
              />
            ) : task.link ? (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <a
                  href={task.link.startsWith("http") ? task.link : `https://${task.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline truncate"
                >
                  {task.link.replace(/^https?:\/\//, "").slice(0, 30)}{task.link.length > 30 ? "..." : ""}
                </a>
                <button
                  type="button"
                  onClick={() => setEditingLink(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ link: null })}
                  className="p-0.5 hover:bg-accent rounded"
                  aria-label="Clear link"
                >
                  <X size={12} className="text-muted-foreground" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingLink(true)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Add link
              </button>
            )}
          </div>
        </div>

        {/* Indicators for files/notes flags */}
        {(task.hasFiles || task.hasNote) && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-3">
            {task.hasFiles && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip size={14} /> Has attachments
              </span>
            )}
            {task.hasNote && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText size={14} /> Has note
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="p-4">
          <textarea
            value={task.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Add note"
            rows={4}
            className="w-full text-sm bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-accent rounded transition-colors"
          aria-label="Close panel"
        >
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">
          Created {new Date(task.createdAt).toLocaleDateString()}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 hover:bg-destructive/20 rounded transition-colors"
          aria-label="Delete task"
        >
          <Trash2 size={18} className="text-destructive" />
        </button>
      </div>
    </div>
  )
}
