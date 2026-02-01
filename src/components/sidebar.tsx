"use client"

import * as React from "react"
import { Sun, Star, Calendar, Home, Plus, FileText, Menu, Search, X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Bucket, BucketGroup } from "@/lib/data-seed"

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
  buckets?: Bucket[]
  bucketGroups?: BucketGroup[]
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
  buckets = [],
  bucketGroups = [],
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [showSearch, setShowSearch] = React.useState(false)
  const [showNewListInput, setShowNewListInput] = React.useState(false)
  const [newListName, setNewListName] = React.useState("")
  const [collapsedBuckets, setCollapsedBuckets] = React.useState<Record<string, boolean>>({})

  const toggleBucket = React.useCallback((bucketId: string) => {
    setCollapsedBuckets(prev => ({ ...prev, [bucketId]: !prev[bucketId] }))
  }, [])

  const handleAddList = React.useCallback(() => {
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
  }, [newListName, onAddList, onSelectList])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddList()
    }
  }, [handleAddList])

  return (
    <div
      className={cn(
        "bg-secondary/50 border-r border-border flex flex-col transition-all duration-200 shrink-0",
        collapsed ? "w-12" : "w-72"
      )}
    >
      {/* Header */}
      <div className="h-12 flex items-center px-3 border-b border-border">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-accent rounded transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={18} className="text-muted-foreground" />
        </button>
        {!collapsed && (
          <button
            type="button"
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
                type="button"
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
          {(buckets.length > 0 || customLists.length > 0) && (
            <div className="h-px bg-border my-2 mx-4" />
          )}

          {/* Bucket-grouped Lists */}
          {buckets.map((bucket) => {
            const groups = bucketGroups.filter(g => g.bucketId === bucket.id)
            const isCollapsed = collapsedBuckets[bucket.id] ?? false
            const bucketTotal = groups.reduce((sum, g) => sum + (getTaskCount(g.id) || 0), 0)

            return (
              <div key={bucket.id} className="mb-1">
                {/* Bucket header */}
                <button
                  type="button"
                  onClick={() => toggleBucket(bucket.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 transition-colors rounded-md mx-1"
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      "text-muted-foreground transition-transform duration-200 shrink-0",
                      !isCollapsed && "rotate-90"
                    )}
                  />
                  <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: bucket.accent }}>
                    {bucket.icon} {bucket.name}
                  </span>
                  {bucketTotal > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-auto">{bucketTotal}</span>
                  )}
                </button>

                {/* Bucket's groups */}
                {!isCollapsed && (
                  <div className="pl-4 pr-2">
                    {groups.map((group) => (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => { onSelectList(group.id); onSearchChange("") }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-left transition-colors",
                          selectedListId === group.id && !searchQuery
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <span className="text-sm shrink-0">{group.icon}</span>
                        <span className="flex-1 text-sm truncate">{group.name}</span>
                        {getTaskCount(group.id) > 0 && (
                          <span className="text-xs text-muted-foreground">{getTaskCount(group.id)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Separator before custom lists */}
          {customLists.length > 0 && buckets.length > 0 && (
            <div className="h-px bg-border my-2 mx-4" />
          )}

          {/* Custom Lists (non-bucket) */}
          <div className="px-2">
            {customLists.map((list) => (
              <div
                key={list.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                  selectedListId === list.id && !searchQuery
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => { onSelectList(list.id); onSearchChange("") }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { onSelectList(list.id); onSearchChange("") } }}
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
                  type="button"
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
                  onKeyDown={handleKeyDown}
                  onBlur={() => { if (!newListName) setShowNewListInput(false) }}
                  placeholder="New list"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  autoFocus
                />
                <button type="button" onClick={handleAddList} className="text-primary text-sm font-medium">
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
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
              type="button"
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
          {buckets.length > 0 && <div className="h-px bg-border my-1 mx-1" />}
          {buckets.map((bucket) => (
            <button
              type="button"
              key={bucket.id}
              onClick={() => {
                const groups = bucketGroups.filter(g => g.bucketId === bucket.id)
                if (groups.length > 0) onSelectList(groups[0].id)
              }}
              className="w-full flex items-center justify-center p-2 hover:bg-accent/50 transition-colors"
              title={bucket.name}
            >
              <span className="text-base">{bucket.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { defaultLists }
