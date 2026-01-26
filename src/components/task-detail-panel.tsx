"use client"

import * as React from "react"
import { Sun, Star, Calendar, Plus, Check, ChevronRight, Trash2, Bell, X } from "lucide-react"
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

  React.useEffect(() => {
    setEditedTitle(task.text)
  }, [task.text])

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onUpdate({ text: editedTitle })
    }
    setIsEditingTitle(false)
  }

  const handleAddStep = () => {
    if (newStepTitle.trim()) {
      onAddStep(newStepTitle)
      setNewStepTitle("")
    }
  }

  return (
    <div className="w-80 bg-secondary/30 border-l border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggleComplete}
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 shrink-0",
              task.completed
                ? "bg-primary border-primary"
                : "border-muted-foreground hover:border-primary"
            )}
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
                onClick={() => setIsEditingTitle(true)}
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
            onClick={onToggleImportant}
            className="p-1 hover:bg-accent rounded transition-colors shrink-0"
          >
            <Star
              size={18}
              className={cn(
                task.important ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors shrink-0"
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
                  onClick={() => onToggleStepComplete(step.id)}
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                    step.completed
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {step.completed && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                </button>
                <span className={cn("text-sm flex-1", step.completed && "line-through text-muted-foreground")}>
                  {step.title}
                </span>
                <button
                  onClick={() => onDeleteStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
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
          onClick={onToggleMyDay}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border"
        >
          <Sun size={18} className={task.myDay ? "text-primary" : "text-muted-foreground"} />
          <span className={cn("text-sm", task.myDay && "text-primary")}>
            {task.myDay ? "Added to My Day" : "Add to My Day"}
          </span>
        </button>

        {/* Reminder (placeholder) */}
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border">
          <Bell size={18} className="text-muted-foreground" />
          <span className="text-sm">Remind me</span>
        </button>

        {/* Due Date */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-muted-foreground" />
            <input
              type="date"
              value={task.dueDate || ""}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
          </div>
          {task.dueDate && (
            <div className="ml-8 text-xs text-muted-foreground mt-1">
              Due {formatDueDate(task.dueDate)}
            </div>
          )}
        </div>

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
          onClick={onClose}
          className="p-2 hover:bg-accent rounded transition-colors"
        >
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">
          Created {new Date(task.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-destructive/20 rounded transition-colors"
        >
          <Trash2 size={18} className="text-destructive" />
        </button>
      </div>
    </div>
  )
}
