/**
 * AI Copilot Engine for Kanban Board
 */
export class AICopilot {
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

    // General AI fallback Q&A
    return {
      reply: `💡 I'm your AI Kanban Copilot! Here are some things you can ask me to do:\n\n` +
        `• *"Create 3 tasks for launching user authentication"* \n` +
        `• *"Show board progress summary"* \n` +
        `• *"Which tasks are urgent?"* \n` +
        `• *"Clear done tasks"*`
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
