// ==================== STATE MANAGEMENT ====================
const state = {
    tasks: [],
    habits: [],
    resources: [],
    favorites: [],
    currentFilter: 'all',
    currentCategoryFilter: 'all',
    currentSort: 'dueDate',
    editingTaskId: null,
    theme: 'light',
    showFavoritesOnly: false
};

// ==================== STORAGE FUNCTIONS ====================
const storage = {
    save() {
        localStorage.setItem('studyBuddyTasks', JSON.stringify(state.tasks));
        localStorage.setItem('studyBuddyHabits', JSON.stringify(state.habits));
        localStorage.setItem('studyBuddyFavorites', JSON.stringify(state.favorites));
        localStorage.setItem('studyBuddyTheme', state.theme);
    },
    
    load() {
        const tasks = localStorage.getItem('studyBuddyTasks');
        const habits = localStorage.getItem('studyBuddyHabits');
        const favorites = localStorage.getItem('studyBuddyFavorites');
        const theme = localStorage.getItem('studyBuddyTheme');
        
        if (tasks) state.tasks = JSON.parse(tasks);
        if (habits) state.habits = JSON.parse(habits);
        if (favorites) state.favorites = JSON.parse(favorites);
        if (theme) state.theme = theme;
    },
    
    reset() {
        localStorage.removeItem('studyBuddyTasks');
        localStorage.removeItem('studyBuddyHabits');
        localStorage.removeItem('studyBuddyFavorites');
        state.tasks = [];
        state.habits = [];
        state.favorites = [];
        state.editingTaskId = null;
    }
};

// ==================== UTILITY FUNCTIONS ====================
const utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ar-SA', options);
    },
    
    getDaysUntil(dateString) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(dateString);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },
    
    isPastDue(dateString) {
        return this.getDaysUntil(dateString) < 0;
    },
    
    isDueSoon(dateString) {
        const days = this.getDaysUntil(dateString);
        return days >= 0 && days <= 2;
    },
    
    getPriorityValue(priority) {
        const values = { high: 3, medium: 2, low: 1 };
        return values[priority] || 0;
    },
    
    getWeekDays() {
        return ['الجمعة', 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    }
};

// ==================== NAVIGATION ====================
const navigation = {
    init() {
        const navLinks = document.querySelectorAll('.nav-link');
        const menuToggle = document.getElementById('menuToggle');
        const appNav = document.getElementById('appNav');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateTo(section);
                
                // Close mobile menu
                if (window.innerWidth <= 768) {
                    appNav.classList.remove('active');
                }
            });
        });
        
        // Mobile menu toggle
        menuToggle.addEventListener('click', () => {
            appNav.classList.toggle('active');
        });
        
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                this.navigateTo(hash);
            }
        });
        
        // Load initial section
        const initialHash = window.location.hash.substring(1);
        this.navigateTo(initialHash || 'dashboard');
    },
    
    navigateTo(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Update hash without scrolling
        history.replaceState(null, null, `#${sectionId}`);
        
        // Update section-specific data
        if (sectionId === 'dashboard') {
            dashboard.update();
        } else if (sectionId === 'tasks') {
            tasks.render();
        } else if (sectionId === 'habits') {
            habits.render();
        } else if (sectionId === 'resources') {
            if (state.resources.length === 0) {
                resources.load();
            }
        }
    }
};

// ==================== DASHBOARD ====================
const dashboard = {
    update() {
        this.updateSummaryCards();
        this.updateProgressBar();
        this.updateTodayTasks();
    },
    
    updateSummaryCards() {
        const dueSoonTasks = state.tasks.filter(task => 
            !task.completed && utils.isDueSoon(task.dueDate)
        );
        
        const completedTasks = state.tasks.filter(task => task.completed);
        
        const habitStreak = habits.calculateWeeklyStreak();
        
        document.getElementById('dueSoonCount').textContent = dueSoonTasks.length;
        document.getElementById('completedCount').textContent = completedTasks.length;
        document.getElementById('habitStreak').textContent = habitStreak;
    },
    
    updateProgressBar() {
        const total = state.tasks.length;
        const completed = state.tasks.filter(task => task.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${percentage}% مكتمل`;
    },
    
    updateTodayTasks() {
        const container = document.getElementById('todayTasksList');
        const todayTasks = state.tasks.filter(task => 
            !task.completed && utils.isDueSoon(task.dueDate)
        ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (todayTasks.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد مهام قريبة</p>';
            return;
        }
        
        container.innerHTML = todayTasks.map(task => {
            const daysUntil = utils.getDaysUntil(task.dueDate);
            const daysText = daysUntil === 0 ? 'اليوم' : 
                            daysUntil === 1 ? 'غداً' : 
                            `بعد ${daysUntil} يوم`;
            
            return `
                <div class="today-task-item ${task.priority}">
                    <div class="today-task-info">
                        <h4>${task.title}</h4>
                        <p><i class="far fa-calendar"></i> ${daysText} - ${task.category}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ==================== TASKS ====================
const tasks = {
    init() {
        const taskForm = document.getElementById('taskForm');
        const quickAddForm = document.getElementById('quickAddForm');
        const tasksList = document.getElementById('tasksList');
        const filterButtons = document.querySelectorAll('.btn-filter');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortSelect = document.getElementById('sortTasks');
        const cancelButton = document.getElementById('taskFormCancel');
        
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        quickAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickAdd();
        });
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                this.render();
            });
        });
        
        categoryFilter.addEventListener('change', (e) => {
            state.currentCategoryFilter = e.target.value;
            this.render();
        });
        
        sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value;
            this.render();
        });
        
        cancelButton.addEventListener('click', () => {
            this.cancelEdit();
        });
        
        // Event delegation for task actions
        tasksList.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const taskId = button.dataset.id;
            
            if (button.classList.contains('btn-complete')) {
                this.toggleComplete(taskId);
            } else if (button.classList.contains('btn-edit')) {
                this.startEdit(taskId);
            } else if (button.classList.contains('btn-delete')) {
                this.delete(taskId);
            }
        });
    },
    
    handleSubmit() {
        if (!this.validate()) return;
        
        const task = {
            id: state.editingTaskId || utils.generateId(),
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value,
            completed: false,
            createdAt: state.editingTaskId ? 
                state.tasks.find(t => t.id === state.editingTaskId).createdAt : 
                new Date().toISOString()
        };
        
        if (state.editingTaskId) {
            const index = state.tasks.findIndex(t => t.id === state.editingTaskId);
            task.completed = state.tasks[index].completed;
            state.tasks[index] = task;
            state.editingTaskId = null;
        } else {
            state.tasks.push(task);
        }
        
        storage.save();
        this.render();
        this.resetForm();
        dashboard.update();
    },
    
    handleQuickAdd() {
        const title = document.getElementById('quickTaskTitle').value.trim();
        const dueDate = document.getElementById('quickTaskDate').value;
        
        if (!title || !dueDate) return;
        
        const task = {
            id: utils.generateId(),
            title,
            description: '',
            dueDate,
            priority: 'medium',
            category: 'دراسة',
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        state.tasks.push(task);
        storage.save();
        
        document.getElementById('quickTaskTitle').value = '';
        document.getElementById('quickTaskDate').value = '';
        
        dashboard.update();
    },
    
    validate() {
        let isValid = true;
        const title = document.getElementById('taskTitle').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;
        
        const titleError = document.getElementById('titleError');
        const dateError = document.getElementById('dateError');
        
        titleError.textContent = '';
        dateError.textContent = '';
        
        if (!title) {
            titleError.textContent = 'يرجى إدخال عنوان المهمة';
            isValid = false;
        }
        
        if (!dueDate) {
            dateError.textContent = 'يرجى تحديد تاريخ الاستحقاق';
            isValid = false;
        }
        
        return isValid;
    },
    
    startEdit(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        state.editingTaskId = taskId;
        
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskDueDate').value = task.dueDate;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskCategory').value = task.category;
        
        document.getElementById('taskFormTitle').textContent = 'تعديل المهمة';
        document.getElementById('taskFormSubmit').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        document.getElementById('taskFormCancel').style.display = 'inline-flex';
        
        // Scroll to form
        document.querySelector('.task-form-card').scrollIntoView({ behavior: 'smooth' });
    },
    
    cancelEdit() {
        state.editingTaskId = null;
        this.resetForm();
    },
    
    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskFormTitle').textContent = 'إضافة مهمة جديدة';
        document.getElementById('taskFormSubmit').innerHTML = '<i class="fas fa-plus"></i> إضافة مهمة';
        document.getElementById('taskFormCancel').style.display = 'none';
        document.getElementById('titleError').textContent = '';
        document.getElementById('dateError').textContent = '';
    },
    
    toggleComplete(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            storage.save();
            this.render();
            dashboard.update();
        }
    },
    
    delete(taskId) {
        modal.show(
            'حذف المهمة',
            'هل أنت متأكد من حذف هذه المهمة؟',
            () => {
                state.tasks = state.tasks.filter(t => t.id !== taskId);
                storage.save();
                this.render();
                dashboard.update();
            }
        );
    },
    
    getFilteredTasks() {
        let filtered = [...state.tasks];
        
        // Apply status filter
        if (state.currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (state.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }
        
        // Apply category filter
        if (state.currentCategoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === state.currentCategoryFilter);
        }
        
        return filtered;
    },
    
    sortTasks(tasks) {
        const sorted = [...tasks];
        
        if (state.currentSort === 'dueDate') {
            sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        } else if (state.currentSort === 'priority') {
            sorted.sort((a, b) => utils.getPriorityValue(b.priority) - utils.getPriorityValue(a.priority));
        } else if (state.currentSort === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
        }
        
        return sorted;
    },
    
    render() {
        const container = document.getElementById('tasksList');
        const filtered = this.getFilteredTasks();
        const sorted = this.sortTasks(filtered);
        
        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد مهام تطابق الفلترة الحالية</p>';
            return;
        }
        
        container.innerHTML = sorted.map(task => {
            const daysUntil = utils.getDaysUntil(task.dueDate);
            const isPastDue = daysUntil < 0;
            const daysText = isPastDue ? `متأخرة ${Math.abs(daysUntil)} يوم` :
                            daysUntil === 0 ? 'اليوم' :
                            daysUntil === 1 ? 'غداً' :
                            `بعد ${daysUntil} يوم`;
            
            const priorityText = {
                high: 'عالية',
                medium: 'متوسطة',
                low: 'منخفضة'
            }[task.priority];
            
            return `
                <div class="task-item ${task.priority} ${task.completed ? 'completed' : ''}">
                    <div class="task-info">
                        <h4>${task.title}</h4>
                        ${task.description ? `<p>${task.description}</p>` : ''}
                        <div class="task-meta">
                            <span class="task-badge priority">
                                <i class="fas fa-flag"></i>
                                ${priorityText}
                            </span>
                            <span class="task-badge category">
                                <i class="fas fa-tag"></i>
                                ${task.category}
                            </span>
                            <span class="task-badge date ${isPastDue ? 'overdue' : ''}">
                                <i class="far fa-calendar"></i>
                                ${daysText}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-sm ${task.completed ? 'btn-secondary' : 'btn-success'} btn-complete" data-id="${task.id}">
                            <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        </button>
                        <button class="btn btn-sm btn-primary btn-edit" data-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ==================== HABITS ====================
const habits = {
    init() {
        const habitForm = document.getElementById('habitForm');
        const habitsList = document.getElementById('habitsList');
        
        habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.add();
        });
        
        // Event delegation for habit actions
        habitsList.addEventListener('click', (e) => {
            const dayButton = e.target.closest('.habit-day');
            const deleteButton = e.target.closest('.btn-delete');
            
            if (dayButton) {
                const habitId = dayButton.dataset.habitId;
                const dayIndex = parseInt(dayButton.dataset.dayIndex);
                this.toggleDay(habitId, dayIndex);
            } else if (deleteButton) {
                const habitId = deleteButton.dataset.id;
                this.delete(habitId);
            }
        });
    },
    
    add() {
        const name = document.getElementById('habitName').value.trim();
        const goal = parseInt(document.getElementById('habitGoal').value);
        
        if (!name || !goal) return;
        
        const habit = {
            id: utils.generateId(),
            name,
            goal,
            progress: [false, false, false, false, false, false, false],
            createdAt: new Date().toISOString()
        };
        
        state.habits.push(habit);
        storage.save();
        this.render();
        
        document.getElementById('habitForm').reset();
        dashboard.update();
    },
    
    toggleDay(habitId, dayIndex) {
        const habit = state.habits.find(h => h.id === habitId);
        if (habit) {
            habit.progress[dayIndex] = !habit.progress[dayIndex];
            storage.save();
            this.render();
            dashboard.update();
        }
    },
    
    delete(habitId) {
        modal.show(
            'حذف العادة',
            'هل أنت متأكد من حذف هذه العادة؟',
            () => {
                state.habits = state.habits.filter(h => h.id !== habitId);
                storage.save();
                this.render();
                dashboard.update();
            }
        );
    },
    
    calculateWeeklyStreak() {
        if (state.habits.length === 0) return 0;
        
        const achievedGoals = state.habits.filter(habit => {
            const completed = habit.progress.filter(day => day).length;
            return completed >= habit.goal;
        }).length;
        
        return achievedGoals;
    },
    
    updateWeeklySummary() {
        const total = state.habits.length;
        const achieved = this.calculateWeeklyStreak();
        document.getElementById('weeklySummary').textContent = `${achieved} من ${total} أهداف محققة`;
    },
    
    render() {
        const container = document.getElementById('habitsList');
        
        if (state.habits.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد عادات حالياً</p>';
            this.updateWeeklySummary();
            return;
        }
        
        const weekDays = utils.getWeekDays();
        
        container.innerHTML = state.habits.map(habit => {
            const completedDays = habit.progress.filter(day => day).length;
            
            return `
                <div class="card habit-item">
                    <div class="habit-header">
                        <h4>${habit.name}</h4>
                        <span class="habit-goal">الهدف: ${habit.goal}/7 أيام</span>
                    </div>
                    <div class="habit-days">
                        ${habit.progress.map((completed, index) => `
                            <button class="habit-day ${completed ? 'completed' : ''}" 
                                    data-habit-id="${habit.id}" 
                                    data-day-index="${index}">
                                <span class="habit-day-name">${weekDays[index]}</span>
                                <span class="habit-day-icon">
                                    <i class="fas ${completed ? 'fa-check' : 'fa-circle'}"></i>
                                </span>
                            </button>
                        `).join('')}
                    </div>
                    <p class="habit-progress">${completedDays} / ${habit.goal}</p>
                    <div class="habit-actions">
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${habit.id}">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.updateWeeklySummary();
    }
};

// ==================== RESOURCES ====================
const resources = {
    init() {
        const searchInput = document.getElementById('resourceSearch');
        const categoryFilter = document.getElementById('resourceCategoryFilter');
        const showFavoritesBtn = document.getElementById('showFavoritesBtn');
        const resourcesList = document.getElementById('resourcesList');
        
        searchInput.addEventListener('input', () => {
            this.render();
        });
        
        categoryFilter.addEventListener('change', () => {
            this.render();
        });
        
        showFavoritesBtn.addEventListener('click', () => {
            state.showFavoritesOnly = !state.showFavoritesOnly;
            showFavoritesBtn.classList.toggle('active', state.showFavoritesOnly);
            this.render();
        });
        
        // Event delegation for favorite toggle
        resourcesList.addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('.resource-favorite');
            if (favoriteBtn) {
                const resourceId = parseInt(favoriteBtn.dataset.id);
                this.toggleFavorite(resourceId);
            }
        });
    },
    
    async load() {
        const container = document.getElementById('resourcesList');
        
        try {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>جاري تحميل الموارد...</p>
                </div>
            `;
            
            const response = await fetch('./resources.json');
            
            if (!response.ok) {
                throw new Error('فشل تحميل الموارد');
            }
            
            const data = await response.json();
            state.resources = data;
            this.render();
            
        } catch (error) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ أثناء تحميل الموارد</p>
                    <button class="btn btn-primary" onclick="resources.load()">
                        إعادة المحاولة
                    </button>
                </div>
            `;
        }
    },
    
    toggleFavorite(resourceId) {
        const index = state.favorites.indexOf(resourceId);
        
        if (index > -1) {
            state.favorites.splice(index, 1);
        } else {
            state.favorites.push(resourceId);
        }
        
        storage.save();
        this.render();
    },
    
    getFilteredResources() {
        let filtered = [...state.resources];
        
        // Search filter
        const searchTerm = document.getElementById('resourceSearch').value.trim().toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(resource => 
                resource.title.toLowerCase().includes(searchTerm) ||
                resource.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Category filter
        const category = document.getElementById('resourceCategoryFilter').value;
        if (category !== 'all') {
            filtered = filtered.filter(resource => resource.category === category);
        }
        
        // Favorites filter
        if (state.showFavoritesOnly) {
            filtered = filtered.filter(resource => state.favorites.includes(resource.id));
        }
        
        return filtered;
    },
    
    render() {
        const container = document.getElementById('resourcesList');
        const filtered = this.getFilteredResources();
        
        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد موارد تطابق البحث</p>';
            return;
        }
        
        container.innerHTML = filtered.map(resource => {
            const isFavorite = state.favorites.includes(resource.id);
            
            return `
                <div class="card resource-item">
                    <div class="resource-content">
                        <h4>${resource.title}</h4>
                        <p>${resource.description}</p>
                        <span class="task-badge category">
                            <i class="fas fa-tag"></i>
                            ${resource.category}
                        </span>
                        <a href="${resource.link}" target="_blank" class="resource-link">
                            <i class="fas fa-external-link-alt"></i>
                            فتح الرابط
                        </a>
                    </div>
                    <button class="resource-favorite ${isFavorite ? 'active' : ''}" data-id="${resource.id}">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </div>
            `;
        }).join('');
    }
};

// ==================== SETTINGS ====================
const settings = {
    init() {
        const themeToggle = document.getElementById('themeToggle');
        const resetDataBtn = document.getElementById('resetDataBtn');
        
        // Load theme
        if (state.theme === 'dark') {
            document.body.classList.add('dark');
            themeToggle.checked = true;
        }
        
        themeToggle.addEventListener('change', () => {
            this.toggleTheme();
        });
        
        resetDataBtn.addEventListener('click', () => {
            this.resetData();
        });
    },
    
    toggleTheme() {
        document.body.classList.toggle('dark');
        state.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
        storage.save();
    },
    
    resetData() {
        modal.show(
            'حذف جميع البيانات',
            'هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
            () => {
                storage.reset();
                tasks.render();
                habits.render();
                dashboard.update();
                
                // Show success message
                alert('تم حذف جميع البيانات بنجاح');
            }
        );
    }
};

// ==================== MODAL ====================
const modal = {
    show(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');
        
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        modal.classList.add('active');
        
        const handleYes = () => {
            onConfirm();
            this.hide();
            cleanup();
        };
        
        const handleNo = () => {
            this.hide();
            cleanup();
        };
        
        const cleanup = () => {
            confirmYes.removeEventListener('click', handleYes);
            confirmNo.removeEventListener('click', handleNo);
        };
        
        confirmYes.addEventListener('click', handleYes);
        confirmNo.addEventListener('click', handleNo);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleNo();
            }
        });
    },
    
    hide() {
        const modal = document.getElementById('confirmModal');
        modal.classList.remove('active');
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load data from localStorage
    storage.load();
    
    // Initialize all modules
    navigation.init();
    tasks.init();
    habits.init();
    resources.init();
    settings.init();
    
    // Update dashboard
    dashboard.update();
    
    // Set minimum date for date inputs to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDueDate').setAttribute('min', today);
    document.getElementById('quickTaskDate').setAttribute('min', today);
});
