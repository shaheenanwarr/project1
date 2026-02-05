
# Create the comprehensive app.js file
js_content = '''/**
 * StudyBuddy SPA - Student Planner Application
 * Features: Tasks CRUD, Habit Tracker, Resources, Dashboard
 * Storage: localStorage
 * No frameworks - Vanilla JavaScript only
 */

// ==========================================
// State Management
// ==========================================
const AppState = {
    tasks: [],
    habits: [],
    favorites: [],
    settings: {
        theme: 'light'
    },
    resources: [],
    currentSection: 'dashboard',
    editingTaskId: null
};

// ==========================================
// Storage Keys
// ==========================================
const STORAGE_KEYS = {
    TASKS: 'studybuddy_tasks',
    HABITS: 'studybuddy_habits',
    FAVORITES: 'studybuddy_favorites',
    SETTINGS: 'studybuddy_settings'
};

// ==========================================
// Utility Functions
// ==========================================
const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    isToday(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    isPast(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },

    getTodayString() {
        return new Date().toISOString().split('T')[0];
    },

    getDayName(index) {
        const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        return days[index];
    },

    getDayIndex(date = new Date()) {
        // Returns 0-6 for Sat-Fri
        return date.getDay();
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ==========================================
// Storage Service
// ==========================================
const Storage = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage save error:', e);
            return false;
        }
    },

    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load error:', e);
            return defaultValue;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }
};

// ==========================================
// Task Service
// ==========================================
const TaskService = {
    getAll() {
        return AppState.tasks;
    },

    getById(id) {
        return AppState.tasks.find(t => t.id === id);
    },

    create(taskData) {
        const task = {
            id: Utils.generateId(),
            title: taskData.title.trim(),
            description: taskData.description?.trim() || '',
            dueDate: taskData.dueDate,
            priority: taskData.priority || 'medium',
            category: taskData.category?.trim() || 'General',
            completed: false,
            createdAt: new Date().toISOString()
        };
        AppState.tasks.push(task);
        this.save();
        return task;
    },

    update(id, updates) {
        const index = AppState.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            AppState.tasks[index] = { ...AppState.tasks[index], ...updates };
            this.save();
            return AppState.tasks[index];
        }
        return null;
    },

    delete(id) {
        AppState.tasks = AppState.tasks.filter(t => t.id !== id);
        this.save();
    },

    toggleComplete(id) {
        const task = this.getById(id);
        if (task) {
            task.completed = !task.completed;
            this.save();
            return task.completed;
        }
        return null;
    },

    save() {
        Storage.save(STORAGE_KEYS.TASKS, AppState.tasks);
    },

    load() {
        AppState.tasks = Storage.load(STORAGE_KEYS.TASKS, []);
    },

    getFilteredAndSorted(statusFilter, categoryFilter, sortBy) {
        let result = [...AppState.tasks];

        // Status filter
        if (statusFilter === 'active') {
            result = result.filter(t => !t.completed);
        } else if (statusFilter === 'completed') {
            result = result.filter(t => t.completed);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            result = result.filter(t => t.category === categoryFilter);
        }

        // Sort
        if (sortBy === 'date') {
            result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        } else if (sortBy === 'priority') {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        }

        return result;
    },

    getCategories() {
        const categories = new Set(AppState.tasks.map(t => t.category));
        return Array.from(categories).sort();
    },

    getStats() {
        const today = Utils.getTodayString();
        const dueSoon = AppState.tasks.filter(t => {
            if (t.completed) return false;
            const due = new Date(t.dueDate);
            const now = new Date();
            const diffTime = due - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 3;
        }).length;

        return {
            total: AppState.tasks.length,
            completed: AppState.tasks.filter(t => t.completed).length,
            dueSoon,
            today: AppState.tasks.filter(t => t.dueDate === today && !t.completed).length
        };
    },

    getTodayTasks() {
        const today = Utils.getTodayString();
        return AppState.tasks
            .filter(t => t.dueDate === today)
            .sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
    },

    getProgressPercentage() {
        if (AppState.tasks.length === 0) return 0;
        return Math.round((AppState.tasks.filter(t => t.completed).length / AppState.tasks.length) * 100);
    }
};

// ==========================================
// Habit Service
// ==========================================
const HabitService = {
    getAll() {
        return AppState.habits;
    },

    create(habitData) {
        const habit = {
            id: Utils.generateId(),
            name: habitData.name.trim(),
            goal: parseInt(habitData.goal) || 5,
            progress: [false, false, false, false, false, false, false], // Sat-Fri
            createdAt: new Date().toISOString(),
            weekStart: this.getWeekStart().toISOString()
        };
        AppState.habits.push(habit);
        this.save();
        return habit;
    },

    delete(id) {
        AppState.habits = AppState.habits.filter(h => h.id !== id);
        this.save();
    },

    toggleDay(habitId, dayIndex) {
        const habit = AppState.habits.find(h => h.id === habitId);
        if (habit) {
            // Check if we need to reset for new week
            this.checkAndResetWeek(habit);
            habit.progress[dayIndex] = !habit.progress[dayIndex];
            this.save();
            return habit.progress[dayIndex];
        }
        return null;
    },

    getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay(); // 0 = Sun, 6 = Sat
        // We want week to start on Saturday (6)
        const diff = (day + 1) % 7;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    checkAndResetWeek(habit) {
        const currentWeekStart = this.getWeekStart();
        const habitWeekStart = new Date(habit.weekStart);
        
        if (currentWeekStart.getTime() !== habitWeekStart.getTime()) {
            habit.progress = [false, false, false, false, false, false, false];
            habit.weekStart = currentWeekStart.toISOString();
        }
    },

    getProgress(habit) {
        this.checkAndResetWeek(habit);
        return habit.progress.filter(p => p).length;
    },

    getCurrentDayIndex() {
        return Utils.getDayIndex();
    },

    getWeeklyStats() {
        let achieved = 0;
        AppState.habits.forEach(habit => {
            this.checkAndResetWeek(habit);
            const completed = this.getProgress(habit);
            if (completed >= habit.goal) achieved++;
        });
        return {
            achieved,
            total: AppState.habits.length
        };
    },

    save() {
        Storage.save(STORAGE_KEYS.HABITS, AppState.habits);
    },

    load() {
        AppState.habits = Storage.load(STORAGE_KEYS.HABITS, []);
        // Check all habits for week reset on load
        AppState.habits.forEach(h => this.checkAndResetWeek(h));
    }
};

// ==========================================
// Resource Service
// ==========================================
const ResourceService = {
    async fetchResources() {
        try {
            const response = await fetch('./resources.json');
            if (!response.ok) throw new Error('Failed to load');
            AppState.resources = await response.json();
            return AppState.resources;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    getAll() {
        return AppState.resources;
    },

    getCategories() {
        const categories = new Set(AppState.resources.map(r => r.category));
        return Array.from(categories).sort();
    },

    searchAndFilter(searchTerm, category) {
        let result = [...AppState.resources];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.title.toLowerCase().includes(term) ||
                r.description.toLowerCase().includes(term)
            );
        }

        if (category && category !== 'all') {
            result = result.filter(r => r.category === category);
        }

        return result;
    },

    toggleFavorite(resourceId) {
        const index = AppState.favorites.indexOf(resourceId);
        if (index > -1) {
            AppState.favorites.splice(index, 1);
        } else {
            AppState.favorites.push(resourceId);
        }
        this.saveFavorites();
        return index === -1;
    },

    isFavorite(resourceId) {
        return AppState.favorites.includes(resourceId);
    },

    saveFavorites() {
        Storage.save(STORAGE_KEYS.FAVORITES, AppState.favorites);
    },

    loadFavorites() {
        AppState.favorites = Storage.load(STORAGE_KEYS.FAVORITES, []);
    }
};

// ==========================================
// Settings Service
// ==========================================
const SettingsService = {
    load() {
        const saved = Storage.load(STORAGE_KEYS.SETTINGS, {});
        AppState.settings = { ...AppState.settings, ...saved };
        this.applyTheme();
    },

    save() {
        Storage.save(STORAGE_KEYS.SETTINGS, AppState.settings);
    },

    setTheme(theme) {
        AppState.settings.theme = theme;
        this.applyTheme();
        this.save();
    },

    applyTheme() {
        document.documentElement.setAttribute('data-theme', AppState.settings.theme);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.checked = AppState.settings.theme === 'dark';
        }
    },

    toggleTheme() {
        const newTheme = AppState.settings.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    resetAll() {
        Storage.clear();
        AppState.tasks = [];
        AppState.habits = [];
        AppState.favorites = [];
        AppState.settings = { theme: 'light' };
        this.applyTheme();
    }
};

// ==========================================
// UI Rendering
// ==========================================
const UI = {
    // Navigation
    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.section');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mainNav = document.getElementById('mainNav');

        // Handle navigation clicks
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.dataset.section;
                this.navigateTo(sectionId);
                
                // Close mobile menu
                mainNav.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });

        // Mobile menu toggle
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            const isOpen = mainNav.classList.contains('active');
            mobileMenuBtn.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });

        // Handle hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && document.getElementById(hash)) {
                this.navigateTo(hash);
            }
        });

        // Check initial hash
        const initialHash = window.location.hash.slice(1);
        if (initialHash && document.getElementById(initialHash)) {
            this.navigateTo(initialHash);
        }
    },

    navigateTo(sectionId) {
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });

        // Show/hide sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        AppState.currentSection = sectionId;
        window.location.hash = sectionId;

        // Refresh section content
        if (sectionId === 'dashboard') this.renderDashboard();
        if (sectionId === 'tasks') this.renderTasks();
        if (sectionId === 'habits') this.renderHabits();
        if (sectionId === 'resources') this.renderResources();

        // Scroll to top
        window.scrollTo(0, 0);
    },

    // Dashboard
    renderDashboard() {
        const stats = TaskService.getStats();
        const progress = TaskService.getProgressPercentage();
        const todayTasks = TaskService.getTodayTasks();
        const weeklyStats = HabitService.getWeeklyStats();

        // Update summary cards
        document.getElementById('dueSoonCount').textContent = stats.dueSoon;
        document.getElementById('completedCount').textContent = stats.completed;
        document.getElementById('habitStreak').textContent = weeklyStats.achieved;

        // Update progress bar
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress}%`;

        // Update today's tasks
        const todayList = document.getElementById('todayTasksList');
        if (todayTasks.length === 0) {
            todayList.innerHTML = '<p class="empty-state">No tasks for today</p>';
        } else {
            todayList.innerHTML = todayTasks.map(task => `
                <div class="today-task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <input type="checkbox" class="today-task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="today-task-title">${this.escapeHtml(task.title)}</span>
                    <span class="badge badge-priority-${task.priority} today-task-priority">${task.priority}</span>
                </div>
            `).join('');

            // Add event listeners for checkboxes
            todayList.querySelectorAll('.today-task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const item = e.target.closest('.today-task-item');
                    const taskId = item.dataset.id;
                    TaskService.toggleComplete(taskId);
                    item.classList.toggle('completed');
                    this.renderDashboard();
                });
            });
        }
    },

    // Tasks
    initTaskForm() {
        const form = document.getElementById('taskForm');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const quickForm = document.getElementById('quickTaskForm');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });

        cancelBtn.addEventListener('click', () => {
            this.resetTaskForm();
        });

        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('quickTaskTitle').value;
            const dueDate = document.getElementById('quickTaskDate').value;
            
            if (title && dueDate) {
                TaskService.create({ title, dueDate, priority: 'medium', category: 'General' });
                Utils.showToast('Task added successfully');
                quickForm.reset();
                document.getElementById('quickTaskDate').value = Utils.getTodayString();
                if (AppState.currentSection === 'tasks') {
                    this.renderTasks();
                }
            }
        });

        // Set default date to today
        document.getElementById('quickTaskDate').value = Utils.getTodayString();
        document.getElementById('taskDueDate').value = Utils.getTodayString();

        // Filter and sort listeners
        document.getElementById('filterStatus').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderTasks());
        document.getElementById('sortBy').addEventListener('change', () => this.renderTasks());
    },

    handleTaskSubmit() {
        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDescription');
        const dateInput = document.getElementById('taskDueDate');
        const priorityInput = document.getElementById('taskPriority');
        const categoryInput = document.getElementById('taskCategory');

        // Validation
        let hasError = false;
        
        if (!titleInput.value.trim()) {
            document.getElementById('titleError').textCon