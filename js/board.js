/**
 * Kanban Board Controller & Drag and Drop Manager
 */
class BoardController {
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
    this.timeFilter = 'today';
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
          assignee: './Me.jpeg',
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
          assignee: 'https://ui-avatars.com/api/?name=Team+Alpha&background=ec4899&color=fff&bold=true',
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
          assignee: 'https://ui-avatars.com/api/?name=Dev+Lead&background=10b981&color=fff&bold=true',
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
          assignee: 'https://ui-avatars.com/api/?name=QA+Tester&background=f59e0b&color=fff&bold=true',
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
          assignee: './Me.jpeg',
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
          assignee: 'https://ui-avatars.com/api/?name=Team+Alpha&background=ec4899&color=fff&bold=true',
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
      dueTime: cardData.dueTime || '',
      estimate: cardData.estimate || '',
      tags: cardData.tags || ['Action'],
      commentsCount: cardData.commentsCount || 0,
      attachmentsCount: cardData.attachmentsCount || 0,
      assignee: cardData.assignee || './Me.jpeg',
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

  updateCardOrder(columnId, container) {
    const cardElements = [...container.querySelectorAll('.card')];
    const orderedCardIds = cardElements.map(el => el.dataset.cardId);
    
    const card = this.cards.find(c => c.id === this.draggedCardId);
    if (card) {
      card.columnId = columnId;
    }

    const otherCards = this.cards.filter(c => c.columnId !== columnId);
    const thisColCards = this.cards.filter(c => c.columnId === columnId);

    thisColCards.sort((a, b) => {
       return orderedCardIds.indexOf(a.id) - orderedCardIds.indexOf(b.id);
    });

    this.cards = [...otherCards, ...thisColCards];
    this.saveState();
    this.render();
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
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

  setFilter(search, priority, time) {
    if (search !== undefined) this.searchQuery = search.toLowerCase();
    if (priority !== undefined) this.priorityFilter = priority;
    if (time !== undefined) this.timeFilter = time;
    this.render();
  }

  getFilteredCards(columnId) {
    return this.cards.filter(card => {
      if (card.columnId !== columnId) return false;
      if (this.priorityFilter !== 'ALL' && card.priority !== this.priorityFilter) return false;
      
      // Time Filtering Logic
      if (this.timeFilter !== 'all') {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD local timezone
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toLocaleDateString('en-CA');

        // Use dueDate, fallback to creation date (first 10 chars of ISO string)
        const activeDate = card.dueDate || card.createdAt.substring(0, 10);
        
        if (this.timeFilter === 'today') {
          // It's today if it matches today's date, or if it's "Today", "Now", etc.
          if (activeDate !== dateString && activeDate.toLowerCase() !== 'today') return false;
        } else if (this.timeFilter === 'yesterday') {
          if (activeDate !== yesterdayString) return false;
        } else if (this.timeFilter === 'upcoming') {
          // If it's greater than today's date string
          if (activeDate <= dateString && activeDate.toLowerCase() !== 'upcoming') return false;
        }
      }

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
            <i data-lucide="more-horizontal" class="lucide-icon"></i>
          </button>
        </div>
        <div class="column-cards-container" data-col-id="${col.id}">
          ${filteredCards.map(card => this.renderCardHTML(card)).join('')}
        </div>
        <button class="add-card-btn" data-col-id="${col.id}">
          <i data-lucide="plus" class="lucide-icon"></i> Add Action
        </button>
      `;

      // Drag & Drop listeners for column container
      const cardsContainer = colEl.querySelector('.column-cards-container');
      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('drag-over');
        
        const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (draggable) {
          if (afterElement == null) {
            cardsContainer.appendChild(draggable);
          } else {
            cardsContainer.insertBefore(draggable, afterElement);
          }
        }
      });

      cardsContainer.addEventListener('dragleave', () => {
        colEl.classList.remove('drag-over');
      });

      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('drag-over');
        if (this.draggedCardId) {
          this.updateCardOrder(col.id, cardsContainer);
          this.draggedCardId = null;
        }
      });

      canvas.appendChild(colEl);
    });

    // Add Column Button at the end of canvas
    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-column-btn';
    addColBtn.id = 'btn-add-column';
    addColBtn.innerHTML = `<i data-lucide="plus-circle" class="lucide-icon" style="font-size:24px;"></i><span>New Column</span>`;
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

    let subtasksHTML = '';
    if (totalSubtasks > 0) {
      subtasksHTML = `
        <div class="card-subtasks" style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
          ${card.subtasks.map((st) => `
            <label class="card-subtask-item" data-st-id="${st.id}" data-card-id="${card.id}" style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
              <input type="checkbox" class="card-subtask-cb" ${st.completed ? 'checked' : ''}>
              <span class="${st.completed ? 'st-completed' : ''}" style="color: var(--text-secondary);">${this.escapeHTML(st.text)}</span>
            </label>
          `).join('')}
        </div>
      `;
    }

    const descriptionHTML = card.description ? 
      `<div class="card-description-preview markdown-body" style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">${window.marked ? window.marked.parse(card.description) : this.escapeHTML(card.description)}</div>` 
      : '';

    return `
      <div class="card" draggable="true" data-card-id="${card.id}">
        <div class="card-tags">
          <span class="tag-badge priority-${card.priority}">${card.priority}</span>
          ${(card.tags || []).map(t => `<span class="tag-badge tag-custom">${this.escapeHTML(t)}</span>`).join('')}
        </div>
        
        <div class="card-title">${this.escapeHTML(card.title)}</div>
        
        ${descriptionHTML}
        ${subtasksHTML}

        <div class="card-footer" style="margin-top: 12px;">
          <div class="card-meta-group">
            <div style="display:flex; align-items:center; gap:10px;">
              ${card.dueDate || card.dueTime ? `
                <div class="meta-item ${isOverdue ? 'overdue' : ''}">
                  <i data-lucide="calendar" class="lucide-icon" style="font-size:12px;"></i>
                  <span>${card.dueDate ? this.formatDate(card.dueDate) : ''} ${card.dueTime || ''}</span>
                </div>
              ` : ''}

              ${card.estimate ? `
                <div class="meta-item" title="Estimated Time">
                  <i data-lucide="clock" class="lucide-icon" style="font-size:12px;"></i>
                  <span>${card.estimate}m</span>
                </div>
              ` : ''}
              
              ${(card.attachmentsCount || 0) > 0 ? `
                <div class="meta-item" title="${card.attachmentsCount} Attachments">
                  <i data-lucide="paperclip" class="lucide-icon" style="font-size:12px;"></i>
                  <span>${card.attachmentsCount}</span>
                </div>
              ` : ''}

              ${(card.commentsCount || 0) > 0 ? `
                <div class="meta-item" title="${card.commentsCount} Comments">
                  <i data-lucide="message-square" class="lucide-icon" style="font-size:12px;"></i>
                  <span>${card.commentsCount}</span>
                </div>
              ` : ''}

              ${totalSubtasks > 0 ? `
                <div class="meta-item subtask-meta">
                  <i data-lucide="check-square" class="lucide-icon" style="font-size:12px;"></i>
                  <span class="st-count">${completedSubtasks}/${totalSubtasks}</span>
                </div>
              ` : ''}
            </div>

          </div>

          ${totalSubtasks > 0 ? `
            <div class="progress-bar-container" title="${progressPercent}% Completed" style="margin-top: 8px;">
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

      cardEl.addEventListener('click', (e) => {
        // Ignore clicks if they occurred on a subtask
        if (e.target.closest('.card-subtasks')) return;
        
        const cardId = cardEl.dataset.cardId;
        const card = this.cards.find(c => c.id === cardId);
        if (card && this.app.modalManager) {
          this.app.modalManager.openCardModal(card);
        }
      });
      
      // Interactive subtasks
      cardEl.querySelectorAll('.card-subtask-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const itemEl = cb.closest('.card-subtask-item');
          const cardId = itemEl.dataset.cardId;
          const stId = itemEl.dataset.stId;
          const card = this.cards.find(c => c.id === cardId);
          if (card) {
            const st = card.subtasks.find(s => s.id === stId);
            if (st) {
              st.completed = cb.checked;
              this.saveState();
              
              const span = itemEl.querySelector('span');
              if (cb.checked) {
                span.classList.add('st-completed');
                span.style.textDecoration = 'line-through';
                span.style.opacity = '0.6';
              } else {
                span.classList.remove('st-completed');
                span.style.textDecoration = 'none';
                span.style.opacity = '1';
              }
              
              const completedCount = card.subtasks.filter(s => s.completed).length;
              const totalCount = card.subtasks.length;
              const percent = Math.round((completedCount / totalCount) * 100);
              
              const progressFill = cardEl.querySelector('.progress-bar-fill');
              if (progressFill) progressFill.style.width = percent + '%';
              
              const progressText = cardEl.querySelector('.st-count');
              if (progressText) progressText.innerText = `${completedCount}/${totalCount}`;
            }
          }
        });
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

  formatDate(d) {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
       const date = new Date(d);
       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }
    return d;
  }
}
