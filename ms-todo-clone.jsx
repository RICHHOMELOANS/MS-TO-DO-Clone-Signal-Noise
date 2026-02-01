import React, { useState, useEffect } from 'react';
import { Sun, Star, Calendar, Home, Plus, Check, ChevronRight, MoreHorizontal, X, Trash2, Bell, RefreshCw, FileText, Menu, Search, Settings, User } from 'lucide-react';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default lists that come with MS To-Do
const defaultLists = [
  { id: 'myday', name: 'My Day', icon: 'sun', isSystem: true, color: '#78909C' },
  { id: 'important', name: 'Important', icon: 'star', isSystem: true, color: '#E91E63' },
  { id: 'planned', name: 'Planned', icon: 'calendar', isSystem: true, color: '#4CAF50' },
  { id: 'tasks', name: 'Tasks', icon: 'home', isSystem: true, color: '#2196F3' },
];

// Sample tasks
const initialTasks = [
  { id: generateId(), listId: 'tasks', title: 'Review project proposal', completed: false, important: true, myDay: true, dueDate: '2026-01-27', steps: [], notes: '', reminder: null, repeat: null, createdAt: new Date().toISOString() },
  { id: generateId(), listId: 'tasks', title: 'Call the dentist', completed: false, important: false, myDay: false, dueDate: null, steps: [], notes: 'Ask about appointment times for next week', reminder: null, repeat: null, createdAt: new Date().toISOString() },
  { id: generateId(), listId: 'tasks', title: 'Buy groceries', completed: true, important: false, myDay: false, dueDate: '2026-01-26', steps: [{ id: generateId(), title: 'Milk', completed: true }, { id: generateId(), title: 'Bread', completed: true }, { id: generateId(), title: 'Eggs', completed: false }], notes: '', reminder: null, repeat: null, createdAt: new Date().toISOString() },
];

// List colors for custom lists
const listColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548'];

export default function MicrosoftToDoClone() {
  const [lists, setLists] = useState(defaultLists);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedListId, setSelectedListId] = useState('myday');
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Get current date info
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentDayName = dayNames[today.getDay()];
  const currentDate = `${monthNames[today.getMonth()]} ${today.getDate()}`;

  // Get selected list
  const selectedList = lists.find(l => l.id === selectedListId) || lists[0];

  // Filter tasks based on selected list
  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      switch (selectedListId) {
        case 'myday':
          filtered = filtered.filter(t => t.myDay);
          break;
        case 'important':
          filtered = filtered.filter(t => t.important);
          break;
        case 'planned':
          filtered = filtered.filter(t => t.dueDate);
          break;
        default:
          filtered = filtered.filter(t => t.listId === selectedListId);
      }
    }
    
    return {
      incomplete: filtered.filter(t => !t.completed),
      completed: filtered.filter(t => t.completed)
    };
  };

  const filteredTasks = getFilteredTasks();

  // Task count for each list
  const getTaskCount = (listId) => {
    switch (listId) {
      case 'myday':
        return tasks.filter(t => t.myDay && !t.completed).length;
      case 'important':
        return tasks.filter(t => t.important && !t.completed).length;
      case 'planned':
        return tasks.filter(t => t.dueDate && !t.completed).length;
      default:
        return tasks.filter(t => t.listId === listId && !t.completed).length;
    }
  };

  // Add new task
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask = {
      id: generateId(),
      listId: selectedListId === 'myday' || selectedListId === 'important' || selectedListId === 'planned' ? 'tasks' : selectedListId,
      title: newTaskTitle,
      completed: false,
      important: selectedListId === 'important',
      myDay: selectedListId === 'myday',
      dueDate: selectedListId === 'planned' ? new Date().toISOString().split('T')[0] : null,
      steps: [],
      notes: '',
      reminder: null,
      repeat: null,
      createdAt: new Date().toISOString()
    };
    
    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
  };

  // Toggle task completion
  const toggleTaskComplete = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  // Toggle task importance
  const toggleTaskImportant = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, important: !t.important } : t
    ));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => ({ ...prev, important: !prev.important }));
    }
  };

  // Toggle My Day
  const toggleMyDay = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, myDay: !t.myDay } : t
    ));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => ({ ...prev, myDay: !prev.myDay }));
    }
  };

  // Update task
  const updateTask = (taskId, updates) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => ({ ...prev, ...updates }));
    }
  };

  // Delete task
  const deleteTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  // Add step to task
  const addStep = (taskId, stepTitle) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStep = { id: generateId(), title: stepTitle, completed: false };
    updateTask(taskId, { steps: [...task.steps, newStep] });
  };

  // Toggle step completion
  const toggleStepComplete = (taskId, stepId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedSteps = task.steps.map(s => 
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    updateTask(taskId, { steps: updatedSteps });
  };

  // Add new list
  const addList = () => {
    if (!newListName.trim()) return;
    
    const newList = {
      id: generateId(),
      name: newListName,
      icon: 'list',
      isSystem: false,
      color: listColors[Math.floor(Math.random() * listColors.length)]
    };
    
    setLists([...lists, newList]);
    setNewListName('');
    setShowNewListInput(false);
    setSelectedListId(newList.id);
  };

  // Delete list
  const deleteList = (listId) => {
    const list = lists.find(l => l.id === listId);
    if (!list || list.isSystem) return;
    
    setLists(lists.filter(l => l.id !== listId));
    setTasks(tasks.filter(t => t.listId !== listId));
    if (selectedListId === listId) {
      setSelectedListId('myday');
    }
  };

  // Get icon component
  const getListIcon = (iconName, color = '#5f6368') => {
    const iconProps = { size: 20, color, strokeWidth: 1.5 };
    switch (iconName) {
      case 'sun': return <Sun {...iconProps} />;
      case 'star': return <Star {...iconProps} />;
      case 'calendar': return <Calendar {...iconProps} />;
      case 'home': return <Home {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  // Format due date
  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Check if date is overdue
  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex h-screen bg-[#faf9f8] font-['Segoe_UI',system-ui,sans-serif] text-[#323130]">
      {/* Sidebar */}
      <div 
        className={`bg-[#f3f2f1] border-r border-[#edebe9] flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-12 flex items-center px-3 border-b border-[#edebe9]">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-[#e1dfdd] rounded transition-colors"
          >
            <Menu size={18} color="#605e5c" />
          </button>
          {!sidebarCollapsed && (
            <>
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-[#e1dfdd] rounded transition-colors ml-1"
              >
                <Search size={18} color="#605e5c" />
              </button>
              <div className="flex-1" />
              <button className="p-2 hover:bg-[#e1dfdd] rounded transition-colors">
                <Settings size={18} color="#605e5c" />
              </button>
            </>
          )}
        </div>

        {/* Search */}
        {!sidebarCollapsed && showSearch && (
          <div className="px-3 py-2 border-b border-[#edebe9]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-white border border-[#8a8886] rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>
        )}

        {/* Lists */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto py-2">
            {/* System Lists */}
            <div className="px-2">
              {lists.filter(l => l.isSystem).map(list => (
                <button
                  key={list.id}
                  onClick={() => { setSelectedListId(list.id); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                    selectedListId === list.id && !searchQuery
                      ? 'bg-[#e1dfdd]' 
                      : 'hover:bg-[#e8e6e4]'
                  }`}
                >
                  {getListIcon(list.icon, list.color)}
                  <span className="flex-1 text-sm">{list.name}</span>
                  {getTaskCount(list.id) > 0 && (
                    <span className="text-xs text-[#605e5c]">{getTaskCount(list.id)}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="h-px bg-[#edebe9] my-2 mx-4" />

            {/* Custom Lists */}
            <div className="px-2">
              {lists.filter(l => !l.isSystem).map(list => (
                <div
                  key={list.id}
                  className={`group flex items-center gap-3 px-3 py-2 rounded transition-colors cursor-pointer ${
                    selectedListId === list.id && !searchQuery
                      ? 'bg-[#e1dfdd]' 
                      : 'hover:bg-[#e8e6e4]'
                  }`}
                  onClick={() => { setSelectedListId(list.id); setSearchQuery(''); }}
                >
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: list.color + '20' }}
                  >
                    <FileText size={14} color={list.color} />
                  </div>
                  <span className="flex-1 text-sm">{list.name}</span>
                  {getTaskCount(list.id) > 0 && (
                    <span className="text-xs text-[#605e5c]">{getTaskCount(list.id)}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#d2d0ce] rounded transition-all"
                  >
                    <X size={14} color="#605e5c" />
                  </button>
                </div>
              ))}
            </div>

            {/* New List */}
            <div className="px-2 mt-1">
              {showNewListInput ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Plus size={18} color="#0078d4" />
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addList()}
                    onBlur={() => { if (!newListName) setShowNewListInput(false); }}
                    placeholder="New list"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                  <button onClick={addList} className="text-[#0078d4] text-sm font-medium">
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewListInput(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded text-left hover:bg-[#e8e6e4] transition-colors"
                >
                  <Plus size={18} color="#0078d4" />
                  <span className="text-sm text-[#0078d4]">New list</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* User */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-[#edebe9]">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-[#0078d4] flex items-center justify-center">
                <User size={16} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Rich Blanchard</div>
                <div className="text-xs text-[#605e5c] truncate">rich@example.com</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div 
          className="px-6 py-4"
          style={{ 
            background: selectedList.id === 'myday' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : selectedList.isSystem 
                ? `linear-gradient(135deg, ${selectedList.color} 0%, ${selectedList.color}dd 100%)`
                : `linear-gradient(135deg, ${selectedList.color || '#2196F3'} 0%, ${selectedList.color || '#2196F3'}dd 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            {selectedList.id === 'myday' ? (
              <Sun size={24} color="white" strokeWidth={1.5} />
            ) : (
              getListIcon(selectedList.icon, 'white')
            )}
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {searchQuery ? 'Search Results' : selectedList.name}
              </h1>
              {selectedList.id === 'myday' && !searchQuery && (
                <p className="text-white/80 text-sm mt-0.5">
                  {currentDayName}, {currentDate}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-4">
            {/* Add Task Input */}
            <div className="bg-white rounded-lg shadow-sm border border-[#edebe9] mb-4 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#0078d4] flex items-center justify-center">
                  <Plus size={14} color="#0078d4" />
                </div>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Add a task"
                  className="flex-1 text-sm focus:outline-none placeholder-[#605e5c]"
                />
                {newTaskTitle && (
                  <button
                    onClick={addTask}
                    className="text-[#0078d4] text-sm font-medium hover:underline"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Task Items */}
            <div className="space-y-1">
              {filteredTasks.incomplete.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => setSelectedTask(task)}
                  onToggleComplete={() => toggleTaskComplete(task.id)}
                  onToggleImportant={() => toggleTaskImportant(task.id)}
                  formatDueDate={formatDueDate}
                  isOverdue={isOverdue}
                />
              ))}
            </div>

            {/* Completed Tasks */}
            {filteredTasks.completed.length > 0 && (
              <div className="mt-6">
                <button className="flex items-center gap-2 text-sm text-[#605e5c] mb-2 hover:text-[#323130]">
                  <ChevronRight size={16} />
                  <span>Completed</span>
                  <span className="text-xs">({filteredTasks.completed.length})</span>
                </button>
                <div className="space-y-1">
                  {filteredTasks.completed.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTask?.id === task.id}
                      onClick={() => setSelectedTask(task)}
                      onToggleComplete={() => toggleTaskComplete(task.id)}
                      onToggleImportant={() => toggleTaskImportant(task.id)}
                      formatDueDate={formatDueDate}
                      isOverdue={isOverdue}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredTasks.incomplete.length === 0 && filteredTasks.completed.length === 0 && (
              <div className="text-center py-12">
                {selectedList.id === 'myday' ? (
                  <>
                    <Sun size={64} className="mx-auto text-[#c8c6c4] mb-4" strokeWidth={1} />
                    <h3 className="text-lg font-medium text-[#605e5c]">Focus on your day</h3>
                    <p className="text-sm text-[#a19f9d] mt-1">Get started by adding tasks</p>
                  </>
                ) : (
                  <>
                    <Check size={64} className="mx-auto text-[#c8c6c4] mb-4" strokeWidth={1} />
                    <h3 className="text-lg font-medium text-[#605e5c]">All done!</h3>
                    <p className="text-sm text-[#a19f9d] mt-1">Nice work finishing all your tasks</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onToggleComplete={() => toggleTaskComplete(selectedTask.id)}
          onToggleImportant={() => toggleTaskImportant(selectedTask.id)}
          onToggleMyDay={() => toggleMyDay(selectedTask.id)}
          onUpdate={(updates) => updateTask(selectedTask.id, updates)}
          onDelete={() => deleteTask(selectedTask.id)}
          onAddStep={(title) => addStep(selectedTask.id, title)}
          onToggleStepComplete={(stepId) => toggleStepComplete(selectedTask.id, stepId)}
          formatDueDate={formatDueDate}
        />
      )}
    </div>
  );
}

// Task Item Component
function TaskItem({ task, isSelected, onClick, onToggleComplete, onToggleImportant, formatDueDate, isOverdue }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border transition-all cursor-pointer ${
        isSelected 
          ? 'border-[#0078d4] shadow-md' 
          : 'border-[#edebe9] hover:border-[#c8c6c4] hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed 
              ? 'bg-[#0078d4] border-[#0078d4]' 
              : 'border-[#8a8886] hover:border-[#0078d4]'
          }`}
        >
          {task.completed && <Check size={12} color="white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${task.completed ? 'line-through text-[#a19f9d]' : ''}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.myDay && (
              <span className="flex items-center gap-1 text-xs text-[#605e5c]">
                <Sun size={12} />
                My Day
              </span>
            )}
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${
                isOverdue(task.dueDate) && !task.completed ? 'text-red-500' : 'text-[#605e5c]'
              }`}>
                <Calendar size={12} />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.steps.length > 0 && (
              <span className="text-xs text-[#605e5c]">
                {task.steps.filter(s => s.completed).length}/{task.steps.length}
              </span>
            )}
            {task.notes && (
              <FileText size={12} className="text-[#605e5c]" />
            )}
          </div>
        </div>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
          className="p-1 hover:bg-[#f3f2f1] rounded transition-colors"
        >
          <Star 
            size={18} 
            className={task.important ? 'fill-[#0078d4] text-[#0078d4]' : 'text-[#8a8886]'} 
          />
        </button>
      </div>
    </div>
  );
}

// Task Detail Panel Component
function TaskDetailPanel({ 
  task, 
  onClose, 
  onToggleComplete, 
  onToggleImportant, 
  onToggleMyDay, 
  onUpdate, 
  onDelete,
  onAddStep,
  onToggleStepComplete,
  formatDueDate 
}) {
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  useEffect(() => {
    setEditedTitle(task.title);
  }, [task.title]);

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onUpdate({ title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  const handleAddStep = () => {
    if (newStepTitle.trim()) {
      onAddStep(newStepTitle);
      setNewStepTitle('');
    }
  };

  return (
    <div className="w-80 bg-[#faf9f8] border-l border-[#edebe9] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#edebe9]">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggleComplete}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 flex-shrink-0 ${
              task.completed 
                ? 'bg-[#0078d4] border-[#0078d4]' 
                : 'border-[#8a8886] hover:border-[#0078d4]'
            }`}
          >
            {task.completed && <Check size={12} color="white" strokeWidth={3} />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
                className="w-full font-medium focus:outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <div 
                onClick={() => setIsEditingTitle(true)}
                className={`font-medium cursor-text ${task.completed ? 'line-through text-[#a19f9d]' : ''}`}
              >
                {task.title}
              </div>
            )}
          </div>

          {/* Star */}
          <button
            onClick={onToggleImportant}
            className="p-1 hover:bg-[#e1dfdd] rounded transition-colors flex-shrink-0"
          >
            <Star 
              size={18} 
              className={task.important ? 'fill-[#0078d4] text-[#0078d4]' : 'text-[#8a8886]'} 
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Steps */}
        <div className="p-4 border-b border-[#edebe9]">
          <div className="space-y-2">
            {task.steps.map(step => (
              <div key={step.id} className="flex items-center gap-3">
                <button
                  onClick={() => onToggleStepComplete(step.id)}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    step.completed 
                      ? 'bg-[#0078d4] border-[#0078d4]' 
                      : 'border-[#8a8886]'
                  }`}
                >
                  {step.completed && <Check size={10} color="white" strokeWidth={3} />}
                </button>
                <span className={`text-sm ${step.completed ? 'line-through text-[#a19f9d]' : ''}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          
          {/* Add Step */}
          <div className="flex items-center gap-3 mt-3">
            <Plus size={16} className="text-[#0078d4]" />
            <input
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStep()}
              placeholder="Add step"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder-[#605e5c]"
            />
          </div>
        </div>

        {/* My Day */}
        <button
          onClick={onToggleMyDay}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f3f2f1] transition-colors border-b border-[#edebe9]"
        >
          <Sun size={18} className={task.myDay ? 'text-[#0078d4]' : 'text-[#605e5c]'} />
          <span className={`text-sm ${task.myDay ? 'text-[#0078d4]' : ''}`}>
            {task.myDay ? 'Added to My Day' : 'Add to My Day'}
          </span>
        </button>

        {/* Reminder */}
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f3f2f1] transition-colors border-b border-[#edebe9]">
          <Bell size={18} className="text-[#605e5c]" />
          <span className="text-sm">Remind me</span>
        </button>

        {/* Due Date */}
        <div className="px-4 py-3 border-b border-[#edebe9]">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-[#605e5c]" />
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            />
          </div>
          {task.dueDate && (
            <div className="ml-8 text-xs text-[#605e5c] mt-1">
              Due {formatDueDate(task.dueDate)}
            </div>
          )}
        </div>

        {/* Repeat */}
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f3f2f1] transition-colors border-b border-[#edebe9]">
          <RefreshCw size={18} className="text-[#605e5c]" />
          <span className="text-sm">Repeat</span>
        </button>

        {/* Notes */}
        <div className="p-4">
          <textarea
            value={task.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Add note"
            rows={4}
            className="w-full text-sm bg-transparent focus:outline-none resize-none placeholder-[#605e5c]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#edebe9] flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#e1dfdd] rounded transition-colors"
        >
          <ChevronRight size={18} className="text-[#605e5c]" />
        </button>
        <span className="text-xs text-[#a19f9d]">
          Created {new Date(task.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-[#e1dfdd] rounded transition-colors"
        >
          <Trash2 size={18} className="text-[#605e5c]" />
        </button>
      </div>
    </div>
  );
}
