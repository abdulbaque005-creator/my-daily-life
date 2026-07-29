/**
 * Kanban Board Controller & Drag and Drop Manager
 */
import { dbManager } from './db.js';

export class BoardController {
  constructor(app) {
    this.app = app;
    this.columns = [
      { id: 'backlog', title: 'Backlog', color: '#64748b' },
      { id: 'todo', title: 'To Do', color: '#6366f1' },
      { id: 'in_progress', title: 'In Progress', color: '#ec4899' },
      { id: 'blocked', title: 'Blocked', color: '#ef4444' },
      { id: 'done', title: 'Done', color: '#10b981' }
    ];
    this.cards = [];
    this.draggedCardId = null;
    this.searchQuery = '';
    this.priorityFilter = 'ALL';
    this.onStateChangeCallbacks = [];
  }

  async init() {
    const saved = await dbManager.loadBoardState();
    if (saved && saved.columns && saved.columns.length > 0) {
      this.columns = saved.columns;
      this.cards = saved.cards || [];
    } else {
      // Seed rich default demo data matching reference images on first load
      this.cards = [
        {
          id: 'card_1',
          columnId: 'todo',
          title: 'Risk Assessment Survey',
          description: 'Uber Launches Emission Savings Feature & Climate Disclosure Rule audit.',
          priority: 'urgent',
          dueDate: 'Nov 2',
          tags: ['Compliance', 'Audit'],
          commentsCount: 2,
          attachmentsCount: 1,
          assignee: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80',
          subtasks: [
            { id: 'st_1', text: 'Create climate metric survey', completed: true },
            { id: 'st_2', text: 'Distribute to operations team', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card_2',
          columnId: 'todo',
          title: 'Employee Training Certification',
          description: 'Supply chain transparency verification and human rights compliance.',
          priority: 'high',
          dueDate: 'Nov 7',
          tags: ['HR', 'Training'],
          commentsCount: 1,
          attachmentsCount: 3,
          assignee: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80',
          subtasks: [
            { id: 'st_3', text: 'Upload video modules', completed: true }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card_3',
          columnId: 'in_progress',
          title: 'Regulatory Submission Deadline',
          description: 'ABP sets target for $32.5 billion in impact investments.',
          priority: 'urgent',
          dueDate: 'Today',
          tags: ['Legal', 'Finance'],
          commentsCount: 6,
          attachmentsCount: 2,
          assignee: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=60&q=80',
          subtasks: [
            { id: 'st_4', text: 'Review legal disclosures', completed: true },
            { id: 'st_5', text: 'Submit PDF to regulator', completed: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card_4',
          columnId: 'in_progress',
          title: 'Third-Party Vendor Due Diligence',
          description: 'Energy Charter Treaty review and vendor background verification.',
          priority: 'medium',
          dueDate: 'Nov 10',
          tags: ['Vendor', 'Security'],
          commentsCount: 2,
          attachmentsCount: 0,
          assignee: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&q=80',
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card_5',
          columnId: 'backlog',
          title: 'Document Audit and Review',
          description: 'Energy Charter Treaty document classification and taxonomy.',
          priority: 'low',
          dueDate: 'Nov 4',
          tags: ['Audit'],
          commentsCount: 5,
          attachmentsCount: 2,
          assignee: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80',
          subtasks: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'card_6',
          columnId: 'done',
          title: 'Internal Audit Preparation',
          description: 'Human Rights and EU recycling standards compliance checks.',
          priority: 'medium',
          dueDate: 'Completed',
          tags: ['Done'],
          commentsCount: 3,
          attachmentsCount: 1,
          assignee: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80',
          subtasks: [
            { id: 'st_6', text: 'Audit report signed off', completed: true }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      await this.saveState();
    }

    this.render();
  }

  async saveState() {
    await dbManager.saveBoardState(this.columns, this.cards);
    this.notifyStateChange();
  }

  subscribeStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  notifyStateChange() {
    this.onStateChangeCallbacks.forEach(cb => cb({ columns: this.columns, cards: this.cards }));
  }

  addCard(columnId, cardData) {
    const newCard = {
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      columnId: columnId || 'todo',
      title: cardData.title || 'Untitled Action',
      description: cardData.description || '',
      priority: cardData.priority || 'medium',
      dueDate: cardData.dueDate || '',
      tags: cardData.tags || ['Action'],
      commentsCount: cardData.commentsCount || 0,
      attachmentsCount: cardData.attachmentsCount || 0,
      assignee: cardData.assignee || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80',
      subtasks: cardData.subtasks || [],
      createdAt: new Date().toISOString()
    };
    this.cards.push(newCard);
    this.saveState();
    this.render();
    return newCard;
  }

  updateCard(cardId, updatedData) {
    const index = this.cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      this.cards[index] = { ...this.cards[index], ...updatedData };
      this.saveState();
      this.render();
    }
  }

  deleteCard(cardId) {
    this.cards = this.cards.filter(c => c.id !== cardId);
    this.saveState();
    this.render();
  }

  moveCard(cardId, targetColumnId) {
    const card = this.cards.find(c => c.id === cardId);
    if (card && card.columnId !== targetColumnId) {
      card.columnId = targetColumnId;
      this.saveState();
      this.render();
    }
  }

  addColumn(title, color = '#8b5cf6') {
    const id = 'col_' + Date.now();
    this.columns.push({ id, title, color });
    this.saveState();
    this.render();
  }

  deleteColumn(columnId) {
    if (confirm('Are you sure you want to delete this column and move its cards to To Do?')) {
      this.cards.forEach(c => {
        if (c.columnId === columnId) c.columnId = 'todo';
      });
      this.columns = this.columns.filter(c => c.id !== columnId);
      this.saveState();
      this.render();
    }
  }

  setFilter(search, priority) {
    if (search !== undefined) this.searchQuery = search.toLowerCase();
    if (priority !== undefined) this.priorityFilter = priority;
    this.render();
  }

  getFilteredCards(columnId) {
    return this.cards.filter(card => {
      if (card.columnId !== columnId) return false;
      if (this.priorityFilter !== 'ALL' && card.priority !== this.priorityFilter) return false;
      if (this.searchQuery) {
        const titleMatch = card.title.toLowerCase().includes(this.searchQuery);
        const descMatch = card.description.toLowerCase().includes(this.searchQuery);
        const tagMatch = (card.tags || []).some(t => t.toLowerCase().includes(this.searchQuery));
        if (!titleMatch && !descMatch && !tagMatch) return false;
      }
      return true;
    });
  }

  render() {
    const canvas = document.getElementById('kanban-canvas');
    if (!canvas) return;

    canvas.innerHTML = '';

    this.columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'column';
      colEl.dataset.colId = col.id;

      const filteredCards = this.getFilteredCards(col.id);

      colEl.innerHTML = `
        <div class="column-header">
          <div class="column-title-container">
            <div class="column-color-indicator" style="background-color: ${col.color}"></div>
            <span class="column-title">${this.escapeHTML(col.title)}</span>
            <span class="column-badge">${filteredCards.length}</span>
          </div>
          <button class="btn btn-icon btn-col-options" data-col-id="${col.id}" title="Column Options">
            <i class="lucide-more-horizontal"></i>
          </button>
        </div>
        <div class="column-cards-container" data-col-id="${col.id}">
          ${filteredCards.map(card => this.renderCardHTML(card)).join('')}
        </div>
        <button class="add-card-btn" data-col-id="${col.id}">
          <i class="lucide-plus"></i> Add Action
        </button>
      `;

      // Drag & Drop listeners for column container
      const cardsContainer = colEl.querySelector('.column-cards-container');
      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('drag-over');
      });

      cardsContainer.addEventListener('dragleave', () => {
        colEl.classList.remove('drag-over');
      });

      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('drag-over');
        if (this.draggedCardId) {
          this.moveCard(this.draggedCardId, col.id);
          this.draggedCardId = null;
        }
      });

      canvas.appendChild(colEl);
    });

    // Add Column Button at the end of canvas
    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-column-btn';
    addColBtn.id = 'btn-add-column';
    addColBtn.innerHTML = `<i class="lucide-plus-circle" style="font-size:24px;"></i><span>New Column</span>`;
    canvas.appendChild(addColBtn);

    // Re-initialize Lucide Icons
    if (window.lucide) window.lucide.createIcons();

    // Attach card & button click listeners
    this.attachCardEventListeners();
  }

  renderCardHTML(card) {
    const completedSubtasks = card.subtasks ? card.subtasks.filter(s => s.completed).length : 0;
    const totalSubtasks = card.subtasks ? card.subtasks.length : 0;
    const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const isOverdue = card.dueDate === 'Today' || (card.dueDate && card.dueDate.includes('Overdue'));

    return `
      <div class="card" draggable="true" data-card-id="${card.id}">
        <div class="card-tags">
          <span class="tag-badge priority-${card.priority}">${card.priority}</span>
          ${(card.tags || []).map(t => `<span class="tag-badge tag-custom">${this.escapeHTML(t)}</span>`).join('')}
        </div>
        
        <div class="card-title">${this.escapeHTML(card.title)}</div>
        
        ${card.description ? `<div class="card-description-preview">${this.escapeHTML(card.description)}</div>` : ''}

        <div class="card-footer">
          <div class="card-meta-group">
            <div style="display:flex; align-items:center; gap:10px;">
              ${card.dueDate ? `
                <div class="meta-item ${isOverdue ? 'overdue' : ''}">
                  <i class="lucide-calendar" style="font-size:12px;"></i>
                  <span>${card.dueDate}</span>
                </div>
              ` : ''}
              
              ${(card.attachmentsCount || 0) > 0 ? `
                <div class="meta-item" title="${card.attachmentsCount} Attachments">
                  <i class="lucide-paperclip" style="font-size:12px;"></i>
                  <span>${card.attachmentsCount}</span>
                </div>
              ` : ''}

              ${(card.commentsCount || 0) > 0 ? `
                <div class="meta-item" title="${card.commentsCount} Comments">
                  <i class="lucide-message-square" style="font-size:12px;"></i>
                  <span>${card.commentsCount}</span>
                </div>
              ` : ''}

              ${totalSubtasks > 0 ? `
                <div class="meta-item">
                  <i class="lucide-check-square" style="font-size:12px;"></i>
                  <span>${completedSubtasks}/${totalSubtasks}</span>
                </div>
              ` : ''}
            </div>

            ${card.assignee ? `
              <img src="${card.assignee}" alt="Assignee" style="width:22px; height:22px; border-radius:50%; object-fit:cover;">
            ` : ''}
          </div>

          ${totalSubtasks > 0 ? `
            <div class="progress-bar-container" title="${progressPercent}% Completed">
              <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  attachCardEventListeners() {
    // Card drag & click listeners
    document.querySelectorAll('.card').forEach(cardEl => {
      cardEl.addEventListener('dragstart', (e) => {
        this.draggedCardId = cardEl.dataset.cardId;
        cardEl.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.draggedCardId);
      });

      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        this.draggedCardId = null;
      });

      cardEl.addEventListener('click', () => {
        const cardId = cardEl.dataset.cardId;
        const card = this.cards.find(c => c.id === cardId);
        if (card && this.app.modalManager) {
          this.app.modalManager.openCardModal(card);
        }
      });
    });

    // Add Card buttons per column
    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.dataset.colId;
        if (this.app.modalManager) {
          this.app.modalManager.openCardModal({ columnId: colId, isNew: true });
        }
      });
    });

    // Column Options buttons
    document.querySelectorAll('.btn-col-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const colId = btn.dataset.colId;
        this.deleteColumn(colId);
      });
    });

    // Add Column Button
    const addColBtn = document.getElementById('btn-add-column');
    if (addColBtn) {
      addColBtn.addEventListener('click', () => {
        if (this.app.modalManager) {
          this.app.modalManager.openColumnModal();
        }
      });
    }
  }

  escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}
