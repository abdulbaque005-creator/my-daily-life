/**
 * Dashboard Controller — Pomodoro, Habits, Journal, Schedule, Greeting
 */
class DashboardController {
  constructor(app) {
    this.app = app;
    const focusMins = parseInt(localStorage.getItem('mdl_focus_duration') || '25');
    this.pomoInterval = null;
    this.pomoRunning = false;
    this.pomoSeconds = focusMins * 60;
    this.pomoTotal = focusMins * 60;
    this.pomoMode = 'focus'; // 'focus' or 'break'
    this.totalFocusMinutes = parseInt(localStorage.getItem('mdl_focus_mins') || '0');

    this.defaultHabits = [
      { id: 'h1', emoji: '💧', name: 'Drink 8 glasses of water', streak: 0 },
      { id: 'h2', emoji: '🏋️', name: 'Exercise 30 minutes', streak: 0 },
      { id: 'h3', emoji: '📖', name: 'Read for 20 minutes', streak: 0 },
      { id: 'h4', emoji: '🧘', name: 'Meditate', streak: 0 },
      { id: 'h5', emoji: '😴', name: 'Sleep before midnight', streak: 0 }
    ];

    this.quotes = [
      '"The secret of getting ahead is getting started." — Mark Twain',
      '"It always seems impossible until it\'s done." — Nelson Mandela',
      '"Do what you can, with what you have, where you are." — Theodore Roosevelt',
      '"Your time is limited, don\'t waste it living someone else\'s life." — Steve Jobs',
      '"Start where you are. Use what you have. Do what you can." — Arthur Ashe',
      '"The only way to do great work is to love what you do." — Steve Jobs',
      '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
      '"Small daily improvements are the key to staggering long-term results." — Unknown',
      '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
      '"Success is the sum of small efforts repeated day in and day out." — Robert Collier',
      '"Discipline is the bridge between goals and accomplishment." — Jim Rohn',
      '"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb'
    ];
  }

  init() {
    this.updateGreeting();
    this.initPomodoro();
    this.initHabits();
    this.initJournal();
    this.updateSchedule();
    this.updateStats();
  }

  // ============================================
  // Greeting Banner
  // ============================================
  updateGreeting() {
    const hour = new Date().getHours();
    let greeting, emoji;
    if (hour < 6)       { greeting = 'Good Night'; emoji = '🌙'; }
    else if (hour < 12) { greeting = 'Good Morning'; emoji = '☀️'; }
    else if (hour < 17) { greeting = 'Good Afternoon'; emoji = '🌤️'; }
    else if (hour < 21) { greeting = 'Good Evening'; emoji = '🌅'; }
    else                { greeting = 'Good Night'; emoji = '🌙'; }

    const name = localStorage.getItem('kanban_display_name') || localStorage.getItem('kanban_user') || 'Friend';
    const el = document.getElementById('dash-greeting-text');
    if (el) el.innerText = `${greeting}, ${name} ${emoji}`;

    // Also update sidebar profile
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.innerText = name;
    const sidebarRole = document.getElementById('sidebar-user-role');
    const username = localStorage.getItem('kanban_user');
    if (sidebarRole && username) sidebarRole.innerText = '@' + username;

    const subEl = document.getElementById('dash-greeting-sub');
    if (subEl) {
      const today = new Date();
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      subEl.innerText = `Happy ${dayName}! It's ${dateStr}. Let's make it count!`;
    }

    const quoteEl = document.getElementById('dash-quote');
    if (quoteEl) {
      const randomQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
      quoteEl.innerText = randomQuote;
    }
  }

  // ============================================
  // Stats
  // ============================================
  updateStats() {
    const cards = this.app.board.cards;
    const today = new Date().toLocaleDateString('en-CA');

    const todayCards = cards.filter(c => {
      const d = c.dueDate || (c.createdAt ? c.createdAt.substring(0, 10) : '');
      return d === today;
    });

    const total = todayCards.length;
    const done = todayCards.filter(c => c.columnId === 'done').length;
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val; };
    el('stat-total', total);
    el('stat-done', done);
    el('stat-streak', productivity + '%');
    el('stat-focus', this.totalFocusMinutes + 'm');
  }

  // ============================================
  // Pomodoro Timer
  // ============================================
  initPomodoro() {
    const startBtn = document.getElementById('pomo-start');
    const resetBtn = document.getElementById('pomo-reset');
    const breakBtn = document.getElementById('pomo-break');

    if (startBtn) startBtn.addEventListener('click', () => this.togglePomodoro());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetPomodoro());
    if (breakBtn) breakBtn.addEventListener('click', () => this.switchPomoMode());

    // Direct Custom Set Button
    const applyBtn = document.getElementById('btn-apply-pomo-custom');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const focusInput = document.getElementById('pomo-custom-focus');
        const breakInput = document.getElementById('pomo-custom-break');
        const focusVal = parseInt(focusInput.value) || 25;
        const breakVal = parseInt(breakInput.value) || 5;

        localStorage.setItem('mdl_focus_duration', focusVal.toString());
        localStorage.setItem('mdl_break_duration', breakVal.toString());

        this.applyTimerSettings();
      });
    }

    // Quick Preset Chips (15m, 20m, 25m, 45m, 60m)
    document.querySelectorAll('.pomo-preset-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        const mins = parseInt(chip.dataset.mins);
        if (!mins) return;

        document.querySelectorAll('.pomo-preset-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const focusInput = document.getElementById('pomo-custom-focus');
        if (focusInput) focusInput.value = mins;

        localStorage.setItem('mdl_focus_duration', mins.toString());
        this.applyTimerSettings();
      });
    });

    this.applyTimerSettings();
  }

  applyTimerSettings() {
    if (this.pomoRunning) return;
    const focusMins = parseInt(localStorage.getItem('mdl_focus_duration') || '25');
    const breakMins = parseInt(localStorage.getItem('mdl_break_duration') || '5');

    const focusInput = document.getElementById('pomo-custom-focus');
    const breakInput = document.getElementById('pomo-custom-break');
    if (focusInput) focusInput.value = focusMins;
    if (breakInput) breakInput.value = breakMins;

    if (this.pomoMode === 'focus') {
      this.pomoTotal = focusMins * 60;
    } else {
      this.pomoTotal = breakMins * 60;
    }
    this.pomoSeconds = this.pomoTotal;
    this.renderPomoTime();
    this.renderPomoRing();
  }

  togglePomodoro() {
    const btn = document.getElementById('pomo-start');
    if (this.pomoRunning) {
      clearInterval(this.pomoInterval);
      this.pomoRunning = false;
      if (btn) { btn.innerText = 'Start'; btn.classList.add('active'); }
    } else {
      this.pomoRunning = true;
      if (btn) { btn.innerText = 'Pause'; btn.classList.remove('active'); }
      this.pomoInterval = setInterval(() => {
        this.pomoSeconds--;
        if (this.pomoSeconds <= 0) {
          clearInterval(this.pomoInterval);
          this.pomoRunning = false;
          if (btn) { btn.innerText = 'Start'; btn.classList.add('active'); }

          if (this.pomoMode === 'focus') {
            this.totalFocusMinutes += Math.round(this.pomoTotal / 60);
            localStorage.setItem('mdl_focus_mins', this.totalFocusMinutes.toString());
            this.updateStats();
          }

          const showAlert = localStorage.getItem('mdl_timer_alert') !== 'false';
          if (showAlert) {
            alert(this.pomoMode === 'focus' ? '🎉 Focus session finished! Time for a well-deserved break.' : '🔔 Break time is over! Ready to focus again?');
          }

          // Auto-switch mode
          this.switchPomoMode();
          return;
        }
        this.renderPomoTime();
        this.renderPomoRing();
      }, 1000);
    }
  }

  resetPomodoro() {
    clearInterval(this.pomoInterval);
    this.pomoRunning = false;
    this.pomoSeconds = this.pomoTotal;
    const btn = document.getElementById('pomo-start');
    if (btn) { btn.innerText = 'Start'; btn.classList.add('active'); }
    this.renderPomoTime();
    this.renderPomoRing();
  }

  switchPomoMode() {
    const breakBtn = document.getElementById('pomo-break');
    const labelEl = document.getElementById('pomo-label');
    const focusMins = parseInt(localStorage.getItem('mdl_focus_duration') || '25');
    const breakMins = parseInt(localStorage.getItem('mdl_break_duration') || '5');

    if (this.pomoMode === 'focus') {
      this.pomoMode = 'break';
      this.pomoTotal = breakMins * 60;
      if (breakBtn) breakBtn.innerText = 'Focus';
      if (labelEl) labelEl.innerText = 'Break';
    } else {
      this.pomoMode = 'focus';
      this.pomoTotal = focusMins * 60;
      if (breakBtn) breakBtn.innerText = 'Break';
      if (labelEl) labelEl.innerText = 'Focus';
    }
    this.resetPomodoro();
  }

  renderPomoTime() {
    const el = document.getElementById('pomo-time');
    if (!el) return;
    const mins = Math.floor(this.pomoSeconds / 60);
    const secs = this.pomoSeconds % 60;
    el.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  renderPomoRing() {
    const ring = document.getElementById('pomo-ring');
    if (!ring) return;
    const circumference = 2 * Math.PI * 70; // r=70
    const progress = this.pomoTotal > 0 ? (this.pomoTotal - this.pomoSeconds) / this.pomoTotal : 0;
    ring.style.strokeDashoffset = circumference * (1 - progress);
  }

  // ============================================
  // Habit Tracker
  // ============================================
  initHabits() {
    const today = new Date().toLocaleDateString('en-CA');
    const savedKey = `mdl_habits_${today}`;
    let saved = JSON.parse(localStorage.getItem(savedKey) || 'null');

    if (!saved) {
      // Check master custom habits list or default
      const customList = JSON.parse(localStorage.getItem('mdl_custom_habits') || 'null');
      const baseHabits = customList || this.defaultHabits;
      saved = baseHabits.map(h => ({ ...h, checked: false }));
    }

    // Toggle Add Habit Form
    const addBtn = document.getElementById('btn-add-habit');
    const form = document.getElementById('add-habit-form');
    const saveBtn = document.getElementById('btn-save-habit');

    if (addBtn && form) {
      addBtn.onclick = () => {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
      };
    }

    if (saveBtn) {
      saveBtn.onclick = () => {
        const emoji = document.getElementById('habit-emoji-input').value.trim() || '✨';
        const name = document.getElementById('habit-name-input').value.trim();

        if (!name) return;

        const newHabit = { id: 'h_' + Date.now(), emoji, name, streak: 0, checked: false };
        saved.push(newHabit);
        localStorage.setItem(savedKey, JSON.stringify(saved));

        // Save master list
        const customList = JSON.parse(localStorage.getItem('mdl_custom_habits') || JSON.stringify(this.defaultHabits));
        customList.push(newHabit);
        localStorage.setItem('mdl_custom_habits', JSON.stringify(customList));

        document.getElementById('habit-name-input').value = '';
        form.style.display = 'none';

        this.renderHabits(saved, savedKey);
      };
    }

    this.renderHabits(saved, savedKey);
  }

  renderHabits(habits, saveKey) {
    const container = document.getElementById('dash-habits');
    if (!container) return;
    container.innerHTML = '';

    habits.forEach((habit, i) => {
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.innerHTML = `
        <span class="habit-emoji">${habit.emoji}</span>
        <span class="habit-name">${habit.name}</span>
        <span class="habit-streak">${habit.streak > 0 ? '🔥 ' + habit.streak + 'd' : ''}</span>
        <input type="checkbox" class="habit-check" ${habit.checked ? 'checked' : ''}>
        <button class="btn btn-icon btn-del-habit" style="width:22px;height:22px;opacity:0.4;margin-left:4px;" title="Delete habit"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
      `;

      const checkbox = row.querySelector('.habit-check');
      checkbox.addEventListener('change', () => {
        habits[i].checked = checkbox.checked;
        localStorage.setItem(saveKey, JSON.stringify(habits));
      });

      const delBtn = row.querySelector('.btn-del-habit');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        habits.splice(i, 1);
        localStorage.setItem(saveKey, JSON.stringify(habits));
        this.renderHabits(habits, saveKey);
      });

      container.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ============================================
  // Quick Journal
  // ============================================
  initJournal() {
    const dateEl = document.getElementById('journal-date');
    if (dateEl) {
      dateEl.innerText = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    }

    const saveBtn = document.getElementById('journal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveJournalEntry());
    }

    this.renderJournalEntries();
  }

  saveJournalEntry() {
    const input = document.getElementById('journal-input');
    if (!input || !input.value.trim()) return;

    const entries = JSON.parse(localStorage.getItem('mdl_journal') || '[]');
    entries.unshift({
      date: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      text: input.value.trim()
    });

    // Keep only last 20 entries
    if (entries.length > 20) entries.length = 20;
    localStorage.setItem('mdl_journal', JSON.stringify(entries));
    input.value = '';
    this.renderJournalEntries();
  }

  renderJournalEntries() {
    const container = document.getElementById('journal-entries');
    if (!container) return;

    const entries = JSON.parse(localStorage.getItem('mdl_journal') || '[]');
    container.innerHTML = entries.slice(0, 5).map(e => `
      <div class="journal-entry-item">
        <div class="je-date">${e.date}</div>
        ${e.text}
      </div>
    `).join('');
  }

  // ============================================
  // Today's Schedule
  // ============================================
  updateSchedule() {
    const container = document.getElementById('dash-schedule');
    if (!container) return;

    const today = new Date().toLocaleDateString('en-CA');
    const cards = this.app.board.cards;

    const scheduled = cards.filter(c => {
      const d = c.dueDate || (c.createdAt ? c.createdAt.substring(0, 10) : '');
      return d === today && (c.startTime || c.dueTime);
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    if (scheduled.length === 0) {
      container.innerHTML = '<div class="schedule-empty">No scheduled tasks for today yet. Add tasks with a time!</div>';
      return;
    }

    container.innerHTML = scheduled.map(card => {
      const time = card.startTime || card.dueTime || '';
      // Convert 24h to 12h for display
      let displayTime = time;
      if (time) {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        displayTime = `${h12}:${m} ${ampm}`;
      }

      const estStr = card.estimate ? `${card.estimate}m` : '';

      return `
        <div class="schedule-item">
          <span class="schedule-time">${displayTime}</span>
          <div class="schedule-divider"></div>
          <span class="schedule-title">${card.title}</span>
          ${estStr ? `<span class="schedule-estimate">${estStr}</span>` : ''}
        </div>
      `;
    }).join('');
  }
}
