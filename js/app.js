/**
 * Main Application Orchestrator for KanbanPro
 */
import { dbManager } from './db.js';
import { BoardController } from './board.js';
import { ModalManager } from './modal.js';
import { AICopilot } from './ai.js';

class KanbanApp {
  constructor() {
    this.board = new BoardController(this);
    this.modalManager = new ModalManager(this);
    this.aiCopilot = new AICopilot(this.board);
  }

  async init() {
    // 1. Initialize Theme from LocalStorage (default to Dark theme)
    this.initTheme();

    // 2. Init Database (IndexedDB with LocalStorage fallback)
    await dbManager.init();

    // 3. Init Modals & DOM overlays
    this.modalManager.init();

    // 4. Init Board Controller
    await this.board.init();

    // 5. Setup Sidebar & Header Listeners
    this.attachNavigationListeners();

    // 6. Setup AI Chat UI
    this.attachAIListeners();

    // 7. Global Keyboard Shortcuts
    this.attachGlobalShortcuts();

    // Subscribe to board state changes to update the live DB sync badge
    this.board.subscribeStateChange(() => {
      const syncBadge = document.getElementById('db-sync-indicator');
      if (syncBadge) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        syncBadge.innerHTML = `<div class="status-dot"></div><span>Synced ${timeStr}</span>`;
      }
    });

    console.log('✨ KanbanPro App initialized successfully');
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
