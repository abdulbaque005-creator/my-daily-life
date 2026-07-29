/**
 * Modal Manager - Task Detail Modal, Database Management Modal & Custom Column Modal
 */
class ModalManager {
  constructor(app) {
    this.app = app;
    this.activeCard = null;
  }

  init() {
    this.createModalDOM();
    this.attachGlobalListeners();
  }

  createModalDOM() {
    const modalHTML = `
      <!-- Task Detail & Edit Modal -->
      <div id="card-modal" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="card-modal-title-text" class="font-display">Edit Task</h3>
            <button class="btn btn-icon modal-close" data-target="card-modal"><i data-lucide="x" class="lucide-icon"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Task / Action Title</label>
              <input type="text" id="modal-card-title" class="form-input" placeholder="e.g. Risk Assessment Survey">
            </div>

            <div style="display: flex; gap: 16px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Column</label>
                <select id="modal-card-column" class="form-select"></select>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Priority</label>
                <select id="modal-card-priority" class="form-select">
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟡 High</option>
                  <option value="medium" selected>🔵 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 16px;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Due Date</label>
                <input type="date" id="modal-card-date" class="form-input">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Tags (comma separated)</label>
                <input type="text" id="modal-card-tags" class="form-input" placeholder="e.g. Audit, Compliance, UI">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="modal-card-desc" class="form-textarea" placeholder="Add detailed description..."></textarea>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label">Subtasks & Checklist</label>
                <button class="btn" id="btn-add-subtask" style="padding: 4px 10px; font-size: 11px;"><i data-lucide="plus" class="lucide-icon"></i> Add Item</button>
              </div>
              <div id="modal-subtasks-container" class="subtasks-list"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" id="btn-delete-card" style="background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); margin-right: auto;">
              <i data-lucide="trash-2" class="lucide-icon"></i> Delete
            </button>
            <button class="btn modal-close" data-target="card-modal">Cancel</button>
            <button class="btn btn-primary" id="btn-save-card">Save Action</button>
          </div>
        </div>
      </div>

      <!-- Custom Column Modal -->
      <div id="col-modal" class="modal-overlay">
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3 class="font-display">Add New Column</h3>
            <button class="btn btn-icon modal-close" data-target="col-modal"><i data-lucide="x" class="lucide-icon"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Column Name</label>
              <input type="text" id="modal-col-name" class="form-input" placeholder="e.g. Testing, For Review...">
            </div>
            <div class="form-group">
              <label class="form-label">Accent Color</label>
              <input type="color" id="modal-col-color" class="form-input" value="#8b5cf6" style="height: 44px; padding: 4px;">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn modal-close" data-target="col-modal">Cancel</button>
            <button class="btn btn-primary" id="btn-save-col">Create Column</button>
          </div>
        </div>
      </div>

      <!-- Database Management Modal -->
      <div id="db-modal" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="font-display"><i data-lucide="database" class="lucide-icon" style="color:var(--accent-primary);"></i> Database Management & Persistence</h3>
            <button class="btn btn-icon modal-close" data-target="db-modal"><i data-lucide="x" class="lucide-icon"></i></button>
          </div>
          <div class="modal-body">
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
              Your Kanban board automatically persists to client-side <strong>IndexedDB</strong> and <strong>LocalStorage</strong> in real-time. You can save manual database snapshots anytime or export/import database JSON files.
            </p>

            <div style="display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="btn-save-db-now" style="flex: 1;">
                <i data-lucide="refresh-cw" class="lucide-icon"></i> Save Database Now
              </button>
              <button class="btn" id="btn-create-snapshot" style="flex: 1;">
                <i data-lucide="save" class="lucide-icon"></i> Save Snapshot
              </button>
              <button class="btn" id="btn-export-json" style="flex: 1;">
                <i data-lucide="download" class="lucide-icon"></i> Export JSON
              </button>
              <button class="btn" id="btn-import-json" style="flex: 1;">
                <i data-lucide="upload" class="lucide-icon"></i> Import Backup
              </button>
              <input type="file" id="import-file-input" accept=".json" style="display: none;">
            </div>

            <div class="form-group" style="margin-top: 16px;">
              <label class="form-label">Saved Database Snapshots</label>
              <div id="snapshots-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn modal-close" data-target="db-modal">Close</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);
  }

  attachGlobalListeners() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        this.closeModal(targetId);
      });
    });

    // Save Card button
    document.getElementById('btn-save-card').addEventListener('click', () => {
      this.saveCardFromModal();
    });

    // Delete Card button
    document.getElementById('btn-delete-card').addEventListener('click', () => {
      if (this.activeCard && this.activeCard.id) {
        this.app.board.deleteCard(this.activeCard.id);
        this.closeModal('card-modal');
      }
    });

    // Add subtask button
    document.getElementById('btn-add-subtask').addEventListener('click', () => {
      this.addSubtaskRow();
    });

    // Save Column button
    document.getElementById('btn-save-col').addEventListener('click', () => {
      const name = document.getElementById('modal-col-name').value.trim();
      const color = document.getElementById('modal-col-color').value;
      if (name) {
        this.app.board.addColumn(name, color);
        this.closeModal('col-modal');
        document.getElementById('modal-col-name').value = '';
      }
    });

    // Save Database Now Button
    document.getElementById('btn-save-db-now').addEventListener('click', async () => {
      await this.app.board.saveState();
      alert('✅ Board state successfully saved to IndexedDB & LocalStorage!');
    });

    // Create Snapshot button
    document.getElementById('btn-create-snapshot').addEventListener('click', async () => {
      await dbManager.saveSnapshot(this.app.board.columns, this.app.board.cards, 'Manual Snapshot');
      this.renderSnapshots();
      alert('🎉 Snapshot saved to Database!');
    });

    // Export JSON Backup
    document.getElementById('btn-export-json').addEventListener('click', () => {
      dbManager.exportJSON(this.app.board.columns, this.app.board.cards);
    });

    // Import JSON Backup
    const fileInput = document.getElementById('import-file-input');
    document.getElementById('btn-import-json').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.columns && data.cards) {
            this.app.board.columns = data.columns;
            this.app.board.cards = data.cards;
            await this.app.board.saveState();
            this.app.board.render();
            this.closeModal('db-modal');
            alert('🎉 Database successfully restored from JSON backup file!');
          } else {
            alert('Invalid database JSON file structure.');
          }
        } catch (err) {
          alert('Error parsing JSON backup file.');
        }
      };
      reader.readAsText(file);
    });
  }

  openCardModal(card = {}) {
    this.activeCard = card;
    const isNew = card.isNew;

    document.getElementById('card-modal-title-text').innerText = isNew ? 'Add New Task' : 'Edit Task';
    document.getElementById('modal-card-title').value = card.title || '';
    document.getElementById('modal-card-desc').value = card.description || '';
    document.getElementById('modal-card-priority').value = card.priority || 'medium';
    document.getElementById('modal-card-date').value = card.dueDate || '';
    document.getElementById('modal-card-tags').value = (card.tags || []).join(', ');

    // Populate columns select dropdown
    const colSelect = document.getElementById('modal-card-column');
    colSelect.innerHTML = this.app.board.columns.map(col =>
      `<option value="${col.id}" ${col.id === (card.columnId || 'todo') ? 'selected' : ''}>${col.title}</option>`
    ).join('');

    // Hide/show delete button for new cards
    document.getElementById('btn-delete-card').style.display = isNew ? 'none' : 'inline-flex';

    // Render subtasks
    this.renderSubtasks(card.subtasks || []);

    this.openModal('card-modal');
  }

  renderSubtasks(subtasks) {
    const container = document.getElementById('modal-subtasks-container');
    container.innerHTML = '';
    subtasks.forEach(st => {
      this.addSubtaskRow(st.text, st.completed, st.id);
    });
  }

  addSubtaskRow(text = '', completed = false, id = null) {
    const container = document.getElementById('modal-subtasks-container');
    const item = document.createElement('div');
    item.className = 'subtask-item';
    item.dataset.stId = id || 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    item.innerHTML = `
      <input type="checkbox" class="subtask-checkbox" ${completed ? 'checked' : ''}>
      <input type="text" class="form-input subtask-input" value="${this.escapeHTML(text)}" placeholder="Subtask description..." style="padding: 4px 8px; font-size: 13px;">
      <button class="btn btn-icon btn-remove-st" style="width: 28px; height: 28px;"><i data-lucide="x" class="lucide-icon"></i></button>
    `;

    item.querySelector('.btn-remove-st').addEventListener('click', () => item.remove());
    container.appendChild(item);
    if (window.lucide) window.lucide.createIcons();
  }

  saveCardFromModal() {
    const title = document.getElementById('modal-card-title').value.trim();
    if (!title) {
      alert('Please enter a task title');
      return;
    }

    const columnId = document.getElementById('modal-card-column').value;
    const priority = document.getElementById('modal-card-priority').value;
    const dueDate = document.getElementById('modal-card-date').value;
    const tagsStr = document.getElementById('modal-card-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const description = document.getElementById('modal-card-desc').value;

    const subtasks = [];
    document.querySelectorAll('.subtask-item').forEach(item => {
      const txt = item.querySelector('.subtask-input').value.trim();
      const chk = item.querySelector('.subtask-checkbox').checked;
      if (txt) {
        subtasks.push({ id: item.dataset.stId, text: txt, completed: chk });
      }
    });

    const cardData = { title, columnId, priority, dueDate, tags, description, subtasks };

    if (this.activeCard && !this.activeCard.isNew && this.activeCard.id) {
      this.app.board.updateCard(this.activeCard.id, cardData);
    } else {
      this.app.board.addCard(columnId, cardData);
    }

    this.closeModal('card-modal');
  }

  openColumnModal() {
    this.openModal('col-modal');
  }

  openDatabaseModal() {
    this.renderSnapshots();
    this.openModal('db-modal');
  }

  renderSnapshots() {
    const listEl = document.getElementById('snapshots-list');
    const snapshots = dbManager.getSnapshotsLocalStorage();

    if (snapshots.length === 0) {
      listEl.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">No snapshots saved yet. Click "Save Snapshot" above.</div>`;
      return;
    }

    listEl.innerHTML = snapshots.map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
        <div>
          <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${this.escapeHTML(s.name)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${s.cardCount} actions saved</div>
        </div>
        <button class="btn btn-restore-snap" data-snap-id="${s.id}" style="padding:4px 10px; font-size:11px;">Restore</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-restore-snap').forEach(btn => {
      btn.addEventListener('click', () => {
        const snapId = btn.dataset.snapId;
        const snap = snapshots.find(s => s.id === snapId);
        if (snap) {
          this.app.board.columns = snap.columns;
          this.app.board.cards = snap.cards;
          this.app.board.saveState();
          this.app.board.render();
          this.closeModal('db-modal');
          alert('🎉 Restored board snapshot!');
        }
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g,
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}
