/**
 * Knowledge Base Controller
 */
class KnowledgeController {
  constructor() {
    this.notes = [];
    this.currentNoteId = null;
    this.storageKey = 'my_daily_life_notes';
    
    // DOM Elements
    this.listEl = document.getElementById('knowledge-list');
    this.emptyStateEl = document.getElementById('knowledge-empty-state');
    this.editorViewEl = document.getElementById('knowledge-editor-view');
    this.titleInput = document.getElementById('knowledge-title');
    this.contentInput = document.getElementById('knowledge-content');
    
    // Buttons
    this.btnNew = document.getElementById('btn-new-note');
    this.btnSave = document.getElementById('btn-save-note');
    this.btnDelete = document.getElementById('btn-delete-note');
  }

  init() {
    this.loadNotes();
    this.bindEvents();
    this.renderList();
  }

  loadNotes() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.notes = JSON.parse(saved);
      } catch (e) {
        this.notes = [];
      }
    } else {
      // Default initial notes
      this.notes = [
        { id: '1', title: 'API Docs', content: '# API Documentation\n\nAll endpoints are prefixed with `/api/v1/`' },
        { id: '2', title: 'Design System', content: '# Design System\n\nColors:\n- Primary: #6366f1\n- Pink: #ec4899' }
      ];
      this.saveNotes();
    }
  }

  saveNotes() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
  }

  bindEvents() {
    if (this.btnNew) {
      this.btnNew.addEventListener('click', () => {
        this.createNewNote();
      });
    }

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => {
        this.saveCurrentNote();
      });
    }

    if (this.btnDelete) {
      this.btnDelete.addEventListener('click', () => {
        this.deleteCurrentNote();
      });
    }
  }

  renderList() {
    if (!this.listEl) return;
    
    this.listEl.innerHTML = '';
    
    if (this.notes.length === 0) {
      this.listEl.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; margin-top: 20px;">No notes yet.</p>';
      return;
    }

    this.notes.forEach(note => {
      const el = document.createElement('div');
      el.className = 'note-item card';
      el.style.padding = '12px 16px';
      el.style.marginBottom = '8px';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s';
      if (note.id === this.currentNoteId) {
        el.style.borderColor = 'var(--accent-primary)';
        el.style.background = 'rgba(99, 102, 241, 0.1)';
      }
      
      el.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
           <i data-lucide="file-text" style="width: 16px; height: 16px; color: var(--accent-primary);"></i>
           <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${note.title || 'Untitled'}</span>
        </div>
      `;
      
      el.addEventListener('click', () => {
        this.openNote(note.id);
      });
      
      this.listEl.appendChild(el);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  createNewNote() {
    const id = Date.now().toString();
    const newNote = {
      id: id,
      title: '',
      content: ''
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    this.openNote(id);
  }

  openNote(id) {
    this.currentNoteId = id;
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    
    this.emptyStateEl.style.display = 'none';
    this.editorViewEl.style.display = 'flex';
    
    this.titleInput.value = note.title;
    this.contentInput.value = note.content;
    
    this.renderList();
  }

  saveCurrentNote() {
    if (!this.currentNoteId) return;
    const note = this.notes.find(n => n.id === this.currentNoteId);
    if (note) {
      note.title = this.titleInput.value;
      note.content = this.contentInput.value;
      this.saveNotes();
      this.renderList();
      
      // Simple flash effect to show it saved
      const originalText = this.btnSave.innerText;
      this.btnSave.innerText = 'Saved!';
      this.btnSave.style.background = 'var(--accent-green)';
      setTimeout(() => {
        this.btnSave.innerText = originalText;
        this.btnSave.style.background = 'var(--accent-primary)';
      }, 1000);
    }
  }

  deleteCurrentNote() {
    if (!this.currentNoteId) return;
    if (confirm('Are you sure you want to delete this note?')) {
      this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
      this.currentNoteId = null;
      this.saveNotes();
      
      this.editorViewEl.style.display = 'none';
      this.emptyStateEl.style.display = 'flex';
      
      this.renderList();
    }
  }
}

// Make it available globally
window.KnowledgeController = KnowledgeController;
