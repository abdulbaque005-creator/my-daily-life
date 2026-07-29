/**
 * Main Application Orchestrator for My Daily Life
 */


class KanbanApp {
  constructor() {
    this.board = new BoardController(this);
    this.modalManager = new ModalManager(this);
    this.aiCopilot = new AICopilot(this.board);
    
    // Initialize Knowledge Base
    if (window.KnowledgeController) {
      this.knowledge = new KnowledgeController();
      this.knowledge.init();
    }
  }

  async init() {
    // 1. Initialize Theme from LocalStorage (default to Dark theme)
    this.initTheme();

    // 2. Init Database (IndexedDB with LocalStorage fallback)
    await dbManager.init();

    // 3. Check Authentication
    this.checkAuth();

    // 4. Init Modals & DOM overlays
    this.modalManager.init();

    // 5. Init Board Controller
    await this.board.init();

    // 6. Setup Sidebar & Header Listeners
    this.attachNavigationListeners();

    // 7. Setup AI Chat UI
    this.attachAIListeners();

    // 8. Global Keyboard Shortcuts
    this.attachGlobalShortcuts();

    // Subscribe to board state changes to update the live DB sync badge and dynamic views
    this.board.subscribeStateChange(() => {
      const syncBadge = document.getElementById('db-sync-indicator');
      if (syncBadge) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        syncBadge.innerHTML = `<div class="status-dot"></div><span>Synced ${timeStr}</span>`;
      }
      this.updateDynamicViews();
    });

    // Start clock interval
    this.initClock();

    console.log('✨ My Daily Life App initialized successfully');
  }

  initTheme() {
    const savedTheme = localStorage.getItem('kanban_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('kanban_theme', newTheme);
  }

  checkAuth() {
    const user = localStorage.getItem('kanban_user');
    const authOverlay = document.getElementById('auth-overlay');
    const authInput = document.getElementById('auth-input');
    const authPassword = document.getElementById('auth-password');
    const authSubmit = document.getElementById('btn-auth-submit');
    const authToggle = document.getElementById('btn-auth-toggle');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authBtnText = document.getElementById('auth-btn-text');
    
    let isSignUp = false;

    if (!user && authOverlay) {
      authOverlay.style.display = 'flex';
      
      if (authToggle) {
        authToggle.addEventListener('click', (e) => {
          e.preventDefault();
          isSignUp = !isSignUp;
          if (isSignUp) {
            authSubtitle.innerText = 'Create a new AI workspace account';
            authBtnText.innerText = 'Sign Up';
            authToggle.innerText = 'Already have an account? Sign in';
          } else {
            authSubtitle.innerText = 'Sign in to access your AI workspace';
            authBtnText.innerText = 'Sign In';
            authToggle.innerText = 'Need an account? Sign up';
          }
        });
      }

      const handleAuth = async () => {
        const identifier = authInput.value.trim();
        const password = authPassword.value.trim();
        
        if (identifier.length < 3 || password.length < 3) {
           authInput.style.borderColor = 'var(--accent-red)';
           authPassword.style.borderColor = 'var(--accent-red)';
           setTimeout(() => {
             authInput.style.borderColor = 'var(--border-subtle)';
             authPassword.style.borderColor = 'var(--border-subtle)';
           }, 2000);
           return;
        }

        // Loading state
        const spinner = authSubmit.querySelector('.auth-spinner');
        if (authBtnText) authBtnText.style.display = 'none';
        if (spinner) spinner.style.display = 'block';
        authSubmit.disabled = true;

        try {
          const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
          const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
          });
          
          const data = await response.json();

          if (response.ok) {
            localStorage.setItem('kanban_user', identifier);
            authOverlay.style.opacity = '0';
            authOverlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
              authOverlay.style.display = 'none';
              if (authBtnText) authBtnText.style.display = '';
              if (spinner) spinner.style.display = 'none';
              authSubmit.disabled = false;
              authOverlay.style.opacity = '1';
            }, 400);
          } else {
            throw new Error(data.error || 'Authentication failed');
          }
        } catch (err) {
           console.error(err);
           alert(err.message);
           if (authBtnText) authBtnText.style.display = '';
           if (spinner) spinner.style.display = 'none';
           authSubmit.disabled = false;
        }
      };

      authSubmit.addEventListener('click', handleAuth);
      
      authPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAuth();
      });
      authInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAuth();
      });
    } else if (authOverlay) {
      authOverlay.style.display = 'none';
    }
  }

  attachNavigationListeners() {
    // Theme Switcher Button
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Sidebar Collapse/Expand Toggle Button
    const sidebarToggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Sidebar Action Buttons (Database & AI)
    const sidebarDbBtn = document.getElementById('btn-sidebar-db');
    if (sidebarDbBtn) {
      sidebarDbBtn.addEventListener('click', () => this.modalManager.openDatabaseModal());
    }

    const sidebarAiBtn = document.getElementById('btn-sidebar-ai');
    if (sidebarAiBtn) {
      sidebarAiBtn.addEventListener('click', () => {
        const aiDrawer = document.getElementById('ai-drawer');
        if (aiDrawer) aiDrawer.classList.remove('collapsed');
      });
    }

    // Top Search Input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.board.setFilter(e.target.value, undefined);
      });
    }

    // Priority Filter Pills
    document.querySelectorAll('.filter-pill[data-priority]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill[data-priority]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const priority = pill.dataset.priority;
        this.board.setFilter(undefined, priority);
      });
    });

    // Header Database Modal Button
    const dbBtn = document.getElementById('btn-open-db');
    if (dbBtn) {
      dbBtn.addEventListener('click', () => this.modalManager.openDatabaseModal());
    }

    // Header New Action Button
    const newTaskBtn = document.getElementById('btn-header-new-task');
    if (newTaskBtn) {
      newTaskBtn.addEventListener('click', () => {
        this.modalManager.openCardModal({ columnId: 'todo', isNew: true });
      });
    }

    // View Switching Logic for Sidebar Links
    const views = {
      'Board': 'view-board',
      'Actions / Board': 'view-board',
      'Dashboard': 'view-dashboard',
      'Roadmap': 'view-roadmap',
      'Horizon': 'view-horizon',
      'Reports': 'view-reports',
      'Knowledge': 'view-knowledge',
      'Workflows': 'view-workflows'
    };

    document.querySelectorAll('.nav-item').forEach(item => {
      // Exclude special action buttons
      if (item.classList.contains('btn-sidebar-action')) return;

      item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(n => {
          if (!n.classList.contains('btn-sidebar-action')) n.classList.remove('active');
        });
        item.classList.add('active');

        // Hide all views
        document.querySelectorAll('.app-view').forEach(v => v.style.display = 'none');

        // Determine and show target view
        const spanText = item.querySelector('span');
        const viewName = spanText ? spanText.innerText.trim() : '';
        const targetViewId = views[viewName] || 'view-coming-soon';
        
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.style.display = 'block';

        // Update breadcrumb
        const breadcrumbEl = document.getElementById('breadcrumb-current-view');
        const breadcrumbParentEl = document.getElementById('breadcrumb-parent-section');
        
        if (breadcrumbEl) {
           breadcrumbEl.innerText = viewName || 'Dashboard';
        }
        
        if (breadcrumbParentEl) {
           const discoverViews = ['Dashboard', 'Roadmap', 'Horizon', 'Reports'];
           if (discoverViews.includes(viewName)) {
             breadcrumbParentEl.innerText = 'Discover';
           } else {
             breadcrumbParentEl.innerText = 'Workspace';
           }
        }

        if (window.lucide) window.lucide.createIcons();
      });
    });
  }

  initClock() {
    const clockEl = document.getElementById('nav-digital-clock');
    const updateClock = () => {
       if (clockEl) {
         clockEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
       }
    };
    updateClock();
    setInterval(updateClock, 1000);
    
    // Also periodically check for urgent tasks
    this.checkUrgentTask();
    setInterval(() => this.checkUrgentTask(), 10000);
  }

  checkUrgentTask() {
    const alertEl = document.getElementById('upcoming-task-alert');
    const textEl = document.getElementById('upcoming-task-text');
    if (!alertEl || !textEl) return;

    // Find the first urgent task that is not done
    const urgentTask = this.board.cards.find(c => c.priority === 'urgent' && c.columnId !== 'done');

    if (urgentTask) {
      textEl.innerText = `Urgent: ${urgentTask.title}`;
      alertEl.style.display = 'flex';
      alertEl.style.cursor = 'pointer';
      alertEl.onclick = () => {
         document.getElementById('btn-sidebar-board').click();
      };
    } else {
      alertEl.style.display = 'none';
    }
  }

  updateDynamicViews() {
    const cards = this.board.cards;
    
    // 1. Dashboard
    const total = cards.length;
    const done = cards.filter(c => c.columnId === 'done').length;
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0;
    
    // Using simple logic to find tasks with upcoming deadlines (assuming we parse tags like 'Due:2026' or just a mock)
    // For now, let's just count tasks that are urgent as deadlines since we don't have explicit date fields yet
    const deadlines = cards.filter(c => c.priority === 'urgent' && c.columnId !== 'done').length;
    
    const prodEl = document.getElementById('dash-productivity');
    if (prodEl) prodEl.innerText = productivity + '%';
    const compEl = document.getElementById('dash-completed');
    if (compEl) compEl.innerText = done;
    const deadEl = document.getElementById('dash-deadlines');
    if (deadEl) deadEl.innerText = deadlines;

    // 2. Horizon Planning
    const horizonContainer = document.getElementById('horizon-container');
    if (horizonContainer) {
      const h1Cards = cards.filter(c => c.priority === 'urgent' || c.priority === 'high');
      const h2Cards = cards.filter(c => c.priority === 'medium' || c.priority === 'low');
      
      horizonContainer.innerHTML = `
        <div class="card" style="padding: 24px;">
          <h3 style="color: var(--accent-primary); margin-bottom: 12px;">Horizon 1: Core Business (High Priority)</h3>
          ${h1Cards.length === 0 ? '<p style="color: var(--text-secondary);">No tasks</p>' : 
            h1Cards.map(c => `<p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 8px;">• ${c.title}</p>`).join('')}
        </div>
        <div class="card" style="padding: 24px;">
          <h3 style="color: var(--accent-pink); margin-bottom: 12px;">Horizon 2: Emerging (Medium/Low)</h3>
          ${h2Cards.length === 0 ? '<p style="color: var(--text-secondary);">No tasks</p>' : 
            h2Cards.map(c => `<p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 8px;">• ${c.title}</p>`).join('')}
        </div>
      `;
    }

    // 3. Roadmap (Timeline Mock based on status)
    const roadmapContainer = document.getElementById('roadmap-container');
    if (roadmapContainer) {
       const q1 = cards.filter(c => c.columnId === 'done');
       const q2 = cards.filter(c => c.columnId === 'in_progress' || c.columnId === 'in_review');
       const q3 = cards.filter(c => c.columnId === 'backlog' || c.columnId === 'todo');

       roadmapContainer.innerHTML = `
          <div class="card" style="padding: 20px; border-left: 4px solid var(--accent-primary);">
             <h3 style="margin-bottom: 8px;">Past / Completed (${q1.length} tasks)</h3>
             <p style="color: var(--text-secondary); font-size: 14px;">
               ${q1.slice(0, 3).map(c => c.title).join(', ')}${q1.length > 3 ? '...' : ''}
             </p>
          </div>
          <div class="card" style="padding: 20px; border-left: 4px solid var(--accent-pink);">
             <h3 style="margin-bottom: 8px;">Current Focus (${q2.length} tasks)</h3>
             <p style="color: var(--text-secondary); font-size: 14px;">
               ${q2.slice(0, 3).map(c => c.title).join(', ')}${q2.length > 3 ? '...' : ''}
             </p>
          </div>
          <div class="card" style="padding: 20px; border-left: 4px solid var(--accent-green); opacity: 0.7;">
             <h3 style="margin-bottom: 8px;">Upcoming Pipeline (${q3.length} tasks)</h3>
             <p style="color: var(--text-secondary); font-size: 14px;">
               ${q3.slice(0, 3).map(c => c.title).join(', ')}${q3.length > 3 ? '...' : ''}
             </p>
          </div>
       `;
    }

    // 4. Reports (Bar Chart)
    const chart = document.getElementById('reports-chart');
    const labels = document.getElementById('reports-labels');
    if (chart && labels) {
      const columnCounts = this.board.columns.map(col => ({
        title: col.title,
        count: cards.filter(c => c.columnId === col.id).length
      }));
      const maxCount = Math.max(...columnCounts.map(c => c.count), 1); // Avoid div by 0

      chart.innerHTML = columnCounts.map((col, i) => {
        const height = (col.count / maxCount) * 100;
        const colors = ['var(--accent-primary)', 'var(--accent-pink)', 'var(--accent-purple)', 'var(--accent-green)'];
        return `
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 8px; height: 100%;">
             <span style="color: var(--text-primary); font-weight: bold;">${col.count}</span>
             <div style="width: 100%; max-width: 60px; height: ${height}%; background: ${colors[i % colors.length]}; border-radius: 4px 4px 0 0; transition: height 0.5s ease;"></div>
          </div>
        `;
      }).join('');

      labels.innerHTML = columnCounts.map(col => `
          <div style="flex: 1; text-align: center;">${col.title}</div>
      `).join('');
    }
  }

  attachAIListeners() {
    const aiToggleBtn = document.getElementById('btn-toggle-ai');
    const aiDrawer = document.getElementById('ai-drawer');
    const aiCloseBtn = document.getElementById('btn-close-ai');
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('btn-send-ai');

    if (aiToggleBtn && aiDrawer) {
      aiToggleBtn.addEventListener('click', () => {
        aiDrawer.classList.toggle('collapsed');
      });
    }

    if (aiCloseBtn && aiDrawer) {
      aiCloseBtn.addEventListener('click', () => {
        aiDrawer.classList.add('collapsed');
      });
    }

    const sendMessage = async () => {
      const text = aiInput.value.trim();
      if (!text) return;

      this.appendChatBubble(text, 'user');
      aiInput.value = '';

      // AI Processing
      const response = await this.aiCopilot.processMessage(text);
      this.appendChatBubble(response.reply, 'ai');
    };

    if (aiSendBtn) aiSendBtn.addEventListener('click', sendMessage);
    if (aiInput) {
      aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    // Quick prompt chips
    document.querySelectorAll('.quick-prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (aiDrawer) aiDrawer.classList.remove('collapsed');
        aiInput.value = chip.innerText;
        sendMessage();
      });
    });
  }

  appendChatBubble(text, sender) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = formatted;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  attachGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K focuses search bar
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }
      // Escape closes active modals or AI drawer
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        const aiDrawer = document.getElementById('ai-drawer');
        if (aiDrawer && !aiDrawer.classList.contains('collapsed')) {
          aiDrawer.classList.add('collapsed');
        }
      }
    });
  }
}

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new KanbanApp();
  window.app.init();
});
