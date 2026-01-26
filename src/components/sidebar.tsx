"use client"

import * as React from "react"
import { Sun, Star, Calendar, Home, Plus, FileText, Menu, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ListId = "myday" | "important" | "planned" | "tasks" | string

export interface TaskList {
  id: ListId
  name: string
  icon: "sun" | "star" | "calendar" | "home" | "list"
  isSystem: boolean
  color: string
}

const defaultLists: TaskList[] = [
  { id: "myday", name: "My Day", icon: "sun", isSystem: true, color: "#78909C" },
  { id: "important", name: "Important", icon: "star", isSystem: true, color: "#E91E63" },
  { id: "planned", name: "Planned", icon: "calendar", isSystem: true, color: "#4CAF50" },
  { id: "tasks", name: "Tasks", icon: "home", isSystem: true, color: "#2196F3" },
]

const listColors = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3",
  "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
  "#FFC107", "#FF9800", "#FF5722", "#795548"
]

interface SidebarProps {
  selectedListId: ListId
  onSelectList: (id: ListId) => void
  customLists: TaskList[]
  onAddList: (list: TaskList) => void
  onDeleteList: (id: string) => void
  getTaskCount: (listId: ListId) => number
  searchQuery: string
  onSearchChange: (query: string) => void
}

function getListIcon(iconName: string, color = "#5f6368") {
  const iconProps = { size: 20, color, strokeWidth: 1.5 }
  switch (iconName) {
    case "sun": return <Sun {...iconProps} />
    case "star": return <Star {...iconProps} />
    case "calendar": return <Calendar {...iconProps} />
    case "home": return <Home {...iconProps} />
    default: return <FileText {...iconProps} />
  }
}

export function Sidebar({
  selectedListId,
  onSelectList,
  customLists,
  onAddList,
  onDeleteList,
  getTaskCount,
  searchQuery,
  onSearchChange,
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [showSearch, setShowSearch] = React.useState(false)
  const [showNewListInput, setShowNewListInput] = React.useState(false)
  const [newListName, setNewListName] = React.useState("")

  const handleAddList = () => {
    if (!newListName.trim()) return

    const newList: TaskList = {
      id: crypto.randomUUID(),
      name: newListName,
      icon: "list",
      isSystem: false,
      color: listColors[Math.floor(Math.random() * listColors.length)],
    }

    onAddList(newList)
    setNewListName("")
    setShowNewListInput(false)
    onSelectList(newList.id)
  }

  const allLists = [...defaultLists, ...customLists]

  return (
    <div
      className={cn(
        "bg-secondary/50 border-r border-border flex flex-col transition-all duration-200 shrink-0",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-12 flex items-center px-3 border-b border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-accent rounded transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={18} className="text-muted-foreground" />
        </button>
        {!collapsed && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-accent rounded transition-colors ml-1"
            aria-label="Toggle search"
          >
            <Search size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Search */}
      {!collapsed && showSearch && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Lists */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2">
          {/* System Lists */}
          <div className="px-2">
            {defaultLists.map((list) => (
              <button
                key={list.id}
                onClick={() => { onSelectList(list.id); onSearchChange("") }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                  selectedListId === list.id && !searchQuery
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
              >
                {getListIcon(list.icon, list.color)}
                <span className="flex-1 text-sm">{list.name}</span>
                {getTaskCount(list.id) > 0 && (
                  <span className="text-xs text-muted-foreground">{getTaskCount(list.id)}</span>
                )}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="h-px bg-border my-2 mx-4" />

          {/* Custom Lists */}
          <div className="px-2">
            {customLists.map((list) => (
              <div
                key={list.id}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                  selectedListId === list.id && !searchQuery
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => { onSelectList(list.id); onSearchChange("") }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: list.color + "20" }}
                >
                  <FileText size={14} color={list.color} />
                </div>
                <span className="flex-1 text-sm">{list.name}</span>
                {getTaskCount(list.id) > 0 && (
                  <span className="text-xs text-muted-foreground">{getTaskCount(list.id)}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteList(list.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-all"
                  aria-label={`Delete ${list.name}`}
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          {/* New List */}
          <div className="px-2 mt-1">
            {showNewListInput ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <Plus size={18} className="text-primary" />
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                  onBlur={() => { if (!newListName) setShowNewListInput(false) }}
                  placeholder="New list"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  autoFocus
                />
                <button onClick={handleAddList} className="text-primary text-sm font-medium">
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewListInput(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-accent/50 transition-colors"
              >
                <Plus size={18} className="text-primary" />
                <span className="text-sm text-primary">New list</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsed state - just icons */}
      {collapsed && (
        <div className="flex-1 py-2 space-y-1">
          {defaultLists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={cn(
                "w-full flex items-center justify-center p-2 transition-colors",
                selectedListId === list.id ? "bg-accent" : "hover:bg-accent/50"
              )}
              title={list.name}
            >
              {getListIcon(list.icon, list.color)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { defaultLists }
