/**
 * AI Copilot Engine for Kanban Board
 */
class AICopilot {
  constructor(boardController) {
    this.board = boardController;
  }

  async processMessage(userPrompt) {
    const text = userPrompt.trim().toLowerCase();

    // Command 1: Auto-generate cards from prompt (e.g., "create 3 tasks for landing page" or "add task...")
    if (text.startsWith('create') || text.startsWith('add') || text.includes('task')) {
      const matchNum = text.match(/\d+/);
      const count = matchNum ? parseInt(matchNum[0]) : 1;

      if (text.includes('tasks for') || text.includes('task for') || text.includes('generate')) {
        const topic = userPrompt.replace(/create|add|generate|\d+|tasks|task|for/gi, '').trim() || 'Project Sprint';
        const generated = this.generateTasksForTopic(topic, count);

        generated.forEach(cardData => {
          this.board.addCard(cardData.columnId || 'todo', cardData);
        });

        return {
          reply: `✨ I have generated **${generated.length} new tasks** for "${topic}" and added them directly to your **To-Do** column!`,
          actionTaken: 'CREATED_CARDS'
        };
      } else {
        // Direct single card creation
        const cardTitle = userPrompt.replace(/create|add|task/gi, '').trim() || 'New Task';
        const newCard = this.board.addCard('todo', {
          title: cardTitle,
          description: 'Created by AI Assistant',
          priority: 'high',
          tags: ['AI-Generated']
        });
        return {
          reply: `✅ Added task **"${newCard.title}"** with High priority to your **To-Do** column.`,
          actionTaken: 'CREATED_CARD'
        };
      }
    }

    // Command 2: Board Summary & Progress Analytics
    if (text.includes('summary') || text.includes('progress') || text.includes('status') || text.includes('how are we doing')) {
      const total = this.board.cards.length;
      const todo = this.board.cards.filter(c => c.columnId === 'todo').length;
      const inProgress = this.board.cards.filter(c => c.columnId === 'in_progress').length;
      const review = this.board.cards.filter(c => c.columnId === 'in_review').length;
      const done = this.board.cards.filter(c => c.columnId === 'done').length;
      const urgent = this.board.cards.filter(c => c.priority === 'urgent').length;

      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        reply: `📊 **Board Status & Health Overview**:\n\n` +
          `• **Total Tasks**: ${total}\n` +
          `• 📝 **To-Do**: ${todo}\n` +
          `• ⚡ **In Progress**: ${inProgress}\n` +
          `• 🔍 **In Review**: ${review}\n` +
          `• 🎉 **Done**: ${done} (${completionRate}% Completed!)\n` +
          `• 🚨 **Urgent Attention**: ${urgent} cards\n\n` +
          (urgent > 0 ? `⚠️ *Tip: You have ${urgent} urgent task(s) requiring immediate attention.*` : `👍 *Your workflow is running smoothly!*`)
      };
    }

    // Command 3: Query Urgent / Overdue Tasks
    if (text.includes('urgent') || text.includes('overdue') || text.includes('high priority')) {
      const urgentCards = this.board.cards.filter(c => c.priority === 'urgent' || c.priority === 'high');
      if (urgentCards.length === 0) {
        return { reply: '🟢 Great news! There are currently no urgent or high priority tasks on the board.' };
      }
      const listStr = urgentCards.map(c => `• **${c.title}** (${c.priority.toUpperCase()} - in column *${c.columnId}*)`).join('\n');
      return {
        reply: `🚨 **Found ${urgentCards.length} High Priority Item(s)**:\n\n${listStr}`
      };
    }

    // Command 4: Reorganize / Move completed items
    if (text.includes('clear done') || text.includes('archive done') || text.includes('clean board')) {
      const doneCards = this.board.cards.filter(c => c.columnId === 'done');
      if (doneCards.length === 0) {
        return { reply: 'The **Done** column is already clear!' };
      }
      doneCards.forEach(c => this.board.deleteCard(c.id));
      return {
        reply: `🧹 Cleared **${doneCards.length} completed task(s)** from the board to keep your view focused.`
      };
    }

    // Command 5: Theme switching
    if (text.includes('dark mode') || text.includes('dark theme') || text.includes('go dark')) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('kanban_theme', 'dark');
      return { reply: '🌙 Switched to **Dark Mode**. My eyes feel better already!' };
    }
    if (text.includes('light mode') || text.includes('light theme') || text.includes('go light') || text.includes('bright')) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('kanban_theme', 'light');
      return { reply: '☀️ Switched to **Light Mode**. Let there be light!' };
    }

    // Command 6: Tag filtering / Search
    if (text.startsWith('find') || text.startsWith('search') || text.includes('show me tasks about')) {
      const keyword = text.replace(/find|search|show me tasks about|tasks with tag/gi, '').trim().toLowerCase();
      if (!keyword) return { reply: 'Please tell me what to search for (e.g. "find Audit")' };
      
      const found = this.board.cards.filter(c => 
        c.title.toLowerCase().includes(keyword) || 
        c.tags.some(t => t.toLowerCase().includes(keyword))
      );
      
      if (found.length === 0) return { reply: `I couldn't find any tasks related to **"${keyword}"**.` };
      
      const listStr = found.map(c => `• **${c.title}** (in ${c.columnId})`).join('\n');
      return { reply: `🔍 **Found ${found.length} matching tasks**:\n\n${listStr}` };
    }

    // Command 7: Clear All Columns (Reset)
    if (text.includes('reset board') || text.includes('delete everything') || text.includes('clear all tasks')) {
      this.board.cards.forEach(c => this.board.deleteCard(c.id));
      return { reply: '⚠️ **Board Reset!** All tasks have been cleared. A fresh start for your daily life.' };
    }

    // Command 8: Prioritize a column
    if (text.includes('prioritize backlog') || text.includes('mark backlog as high')) {
      const backlogCards = this.board.cards.filter(c => c.columnId === 'backlog');
      backlogCards.forEach(c => {
        c.priority = 'high';
        this.board.updateCard(c.id, c);
      });
      return { reply: `🚀 Upgraded **${backlogCards.length} Backlog tasks** to High priority.` };
    }

    // Conversational/Greetings
    if (text === 'hi' || text === 'hello' || text === 'hey') {
      return { reply: 'Hello! 👋 I am your smart assistant for **My Daily Life**. How can I help you be more productive today?' };
    }
    if (text.includes('thank you') || text.includes('thanks')) {
      return { reply: 'You are very welcome! Let me know if you need anything else.' };
    }

    // General AI fallback Q&A
    return {
      reply: `💡 I'm your AI Copilot! Here are some smart things I can do for you:\n\n` +
        `• *"Create 3 tasks for launching user authentication"* \n` +
        `• *"Show board progress summary"* \n` +
        `• *"Which tasks are urgent?"* \n` +
        `• *"Clear done tasks"* \n` +
        `• *"Switch to light mode / dark mode"* \n` +
        `• *"Find tasks about Audit"* \n` +
        `• *"Reset board"*`
    };
  }

  generateTasksForTopic(topic, count) {
    const templates = [
      { title: `Setup initial baseline architecture for ${topic}`, priority: 'urgent', tags: [topic, 'Tech'] },
      { title: `Design UI mocks & glassmorphic layouts for ${topic}`, priority: 'high', tags: [topic, 'Design'] },
      { title: `Implement core REST API & Database schema for ${topic}`, priority: 'high', tags: [topic, 'Backend'] },
      { title: `Write comprehensive unit tests for ${topic}`, priority: 'medium', tags: [topic, 'QA'] },
      { title: `Conduct user testing & security audit on ${topic}`, priority: 'low', tags: [topic, 'Review'] }
    ];

    return templates.slice(0, Math.min(count, templates.length));
  }
}
