/**
 * Chat System - Real-time messaging with Socket.io
 * Handles conversation management, message sending/receiving, and real-time updates
 */

class ChatManager {
  constructor() {
    this.currentConversationId = null;
    this.currentUserId = null;
    this.conversations = [];
    this.messages = new Map(); // Cache messages by conversation ID
    this.typingTimeouts = new Map();
    this.isTyping = false;
    this.socket = null;

    this.init();
  }

  init() {
    // Get socket from global scope (initialized in main.js)
    if (typeof socket === 'undefined') {
      console.error('Socket.io not initialized. Make sure main.js is loaded first.');
      return;
    }

    this.socket = socket;
    this.getCurrentUserId();
    this.attachEventListeners();
    this.setupSocketListeners();
    this.loadConversations();
  }

  getCurrentUserId() {
    // Try to get user ID from page data or session
    const userIdEl = document.getElementById('currentUserId');
    if (userIdEl) {
      this.currentUserId = parseInt(userIdEl.value);
    }
  }

  attachEventListeners() {
    // Send message
    document.getElementById('sendBtn')?.addEventListener('click', () => this.sendMessage());

    // Textarea enter to send
    const textarea = document.getElementById('messageInput');
    textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    textarea?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      this.handleTyping();
    });

    // New chat button
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
      this.openNewChatModal();
    });

    // User search in new chat modal
    document.getElementById('newChatUserSearch')?.addEventListener('input', (e) => {
      this.searchUsers(e.target.value.trim());
    });

    // Start chat button
    document.getElementById('startChatBtn')?.addEventListener('click', () => {
      this.startNewChat();
    });

    // File upload
    document.getElementById('chatFileInput')?.addEventListener('change', (e) => {
      this.handleFileUpload(e);
    });
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // New message in current conversation
    this.socket.on('chat:message', (data) => {
      if (data.conversation_id === this.currentConversationId) {
        this.loadMessages();
      }
      this.loadConversations(); // Refresh list to update last message
    });

    // Typing indicator
    this.socket.on('chat:typing', (data) => {
      if (data.conversation_id === this.currentConversationId) {
        this.showTypingIndicator(data.user_name);
      }
    });

    // Conversation marked as read
    this.socket.on('chat:read', (data) => {
      this.loadConversations(); // Refresh to update unread badges
    });

    // Message edited
    this.socket.on('chat:message_edited', (data) => {
      if (data.conversation_id === this.currentConversationId) {
        this.loadMessages();
      }
    });

    // Message deleted
    this.socket.on('chat:message_deleted', (data) => {
      if (data.conversation_id === this.currentConversationId) {
        this.loadMessages();
      }
    });

    // User presence
    this.socket.on('user:online', (data) => {
      this.updateParticipantStatus(data.user_id, 'online');
    });

    this.socket.on('user:offline', (data) => {
      this.updateParticipantStatus(data.user_id, 'offline');
    });
  }

  async loadConversations() {
    try {
      const response = await fetch('/chat/api/conversations', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Failed to load conversations');

      this.conversations = await response.json();
      this.renderConversationList();
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.showError('Failed to load conversations');
    }
  }

  renderConversationList() {
    const list = document.getElementById('conversationList');
    if (!list) return;

    if (this.conversations.length === 0) {
      list.innerHTML = '<div class="text-center py-8"><p class="text-sm text-gray-500 dark_text-neutral-400">No conversations yet. Start a new chat!</p></div>';
      return;
    }

    list.innerHTML = this.conversations.map(conv => `
      <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''} ${this.currentConversationId === null && conv.id === this.conversations[0].id ? 'auto-select' : ''}"
           onclick="chatManager.selectConversation(${conv.id})"
           data-conversation-id="${conv.id}">
        <div class="flex items-center gap-3 min-w-0">
          <img src="/images/default-avatar.png"
               alt="${conv.creator_name || 'User'}"
               class="w-10 h-10 rounded-full bg-gray-300 dark_bg-neutral-600 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark_text-white truncate">${this.escapeHtml(conv.creator_name || 'Unknown')}</p>
            <p class="text-xs text-gray-500 dark_text-neutral-400 truncate">${this.escapeHtml(conv.last_message || 'No messages yet')}</p>
            <p class="text-xs text-gray-400 dark_text-neutral-500">${this.formatTimeAgo(conv.last_message_at)}</p>
          </div>
          ${conv.unread_count > 0 ? `<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full flex-shrink-0">${Math.min(conv.unread_count, 99)}</span>` : ''}
        </div>
      </div>
    `).join('');

    // Auto-select first conversation if none selected
    if (this.currentConversationId === null && this.conversations.length > 0) {
      this.selectConversation(this.conversations[0].id);
    }
  }

  async selectConversation(conversationId) {
    this.currentConversationId = conversationId;
    await this.loadMessages();
    this.renderConversationList(); // Update selection highlight
    this.updateChatHeader();
  }

  async loadMessages() {
    if (!this.currentConversationId) return;

    try {
      const response = await fetch(`/chat/api/conversations/${this.currentConversationId}/messages`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const messages = await response.json();
      this.messages.set(this.currentConversationId, messages);
      this.renderMessages(messages);

      // Mark conversation as read
      this.markAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
      this.showError('Failed to load messages');
    }
  }

  renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = '<div class="text-center py-8"><p class="text-sm text-gray-500 dark_text-neutral-400">No messages yet. Start the conversation!</p></div>';
      return;
    }

    container.innerHTML = messages.map(msg => {
      const isOwnMessage = msg.sender_id === this.currentUserId;
      const timestamp = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="message-bubble ${isOwnMessage ? 'own' : 'other'}" data-message-id="${msg.id}">
          <div class="message-content">
            <p class="text-sm break-words">${this.escapeHtml(msg.message)}</p>
            ${msg.is_edited ? '<p class="text-xs opacity-70 mt-1">(edited)</p>' : ''}
            <div class="message-time">${timestamp}</div>
            ${isOwnMessage ? `
              <div class="message-actions">
                <button onclick="chatManager.editMessage(${msg.id})" title="Edit">✏️</button>
                <button onclick="chatManager.deleteMessage(${msg.id})" title="Delete">🗑️</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !this.currentConversationId) return;

    try {
      const response = await fetch(`/chat/api/conversations/${this.currentConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) throw new Error('Failed to send message');

      input.value = '';
      input.style.height = 'auto';
      this.isTyping = false;

      // Emit typing stopped
      if (this.socket) {
        this.socket.emit('chat:typing_stop', {
          conversation_id: this.currentConversationId
        });
      }

      await this.loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      this.showError('Failed to send message');
    }
  }

  handleTyping() {
    if (!this.isTyping && document.getElementById('messageInput').value.trim() !== '') {
      this.isTyping = true;

      if (this.socket) {
        this.socket.emit('chat:typing', {
          conversation_id: this.currentConversationId
        });
      }
    }
  }

  showTypingIndicator(userName) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.innerHTML = `
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
          <p class="ml-2">${this.escapeHtml(userName)} is typing...</p>
        </div>
      `;

      // Clear after 3 seconds
      if (this.typingTimeouts.has(userName)) {
        clearTimeout(this.typingTimeouts.get(userName));
      }

      const timeout = setTimeout(() => {
        indicator.innerHTML = '<p class="text-xs text-gray-400">&nbsp;</p>';
        this.typingTimeouts.delete(userName);
      }, 3000);

      this.typingTimeouts.set(userName, timeout);
    }
  }

  async markAsRead() {
    if (!this.currentConversationId) return;

    try {
      await fetch(`/chat/api/conversations/${this.currentConversationId}/read`, {
        method: 'PATCH',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async editMessage(messageId) {
    const messages = this.messages.get(this.currentConversationId) || [];
    const message = messages.find(m => m.id === messageId);

    if (!message) return;

    const newText = prompt('Edit message:', message.message);
    if (newText === null) return;

    try {
      const response = await fetch(`/chat/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ message: newText })
      });

      if (!response.ok) throw new Error('Failed to edit message');

      await this.loadMessages();
    } catch (error) {
      console.error('Error editing message:', error);
      this.showError('Failed to edit message');
    }
  }

  async deleteMessage(messageId) {
    if (!confirm('Delete this message? This cannot be undone.')) return;

    try {
      const response = await fetch(`/chat/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Failed to delete message');

      await this.loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      this.showError('Failed to delete message');
    }
  }

  openNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.classList.remove('hidden');
      document.getElementById('newChatUserSearch')?.focus();
    }
  }

  async searchUsers(query) {
    const resultsContainer = document.getElementById('userSearchResults');
    if (!resultsContainer) return;

    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    try {
      const response = await fetch(`/chat/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Failed to search users');

      const users = await response.json();
      resultsContainer.innerHTML = users.map(user => `
        <div class="p-3 hover_bg-gray-100 dark_hover_bg-neutral-700 rounded-lg cursor-pointer transition-colors"
             onclick="chatManager.selectUserForChat(${user.id}, '${this.escapeHtml(user.name)}')">
          <p class="text-sm font-medium text-gray-900 dark_text-white">${this.escapeHtml(user.name)}</p>
          <p class="text-xs text-gray-500 dark_text-neutral-400">${this.escapeHtml(user.email)}</p>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error searching users:', error);
      resultsContainer.innerHTML = '<p class="text-sm text-red-600">Error searching users</p>';
    }
  }

  selectUserForChat(userId, userName) {
    document.getElementById('startChatBtn').disabled = false;
    document.getElementById('startChatBtn').dataset.userId = userId;
    document.getElementById('newChatUserSearch').value = userName;
    document.getElementById('userSearchResults').innerHTML = '';
  }

  async startNewChat() {
    const userId = document.getElementById('startChatBtn').dataset.userId;
    if (!userId) return;

    try {
      const response = await fetch('/chat/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ participant_id: parseInt(userId) })
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();

      // Close modal
      const modal = document.getElementById('newChatModal');
      if (modal) {
        modal.classList.add('hidden');
        document.getElementById('newChatUserSearch').value = '';
        document.getElementById('startChatBtn').disabled = true;
        delete document.getElementById('startChatBtn').dataset.userId;
      }

      // Load new conversation
      await this.loadConversations();
      await this.selectConversation(data.conversation_id);
    } catch (error) {
      console.error('Error creating conversation:', error);
      this.showError('Failed to create conversation');
    }
  }

  handleFileUpload(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    // For now, just show an alert
    // Full file upload implementation would require additional API endpoint
    alert('File upload feature coming soon!');

    // Reset input
    e.target.value = '';
  }

  updateChatHeader() {
    const conv = this.conversations.find(c => c.id === this.currentConversationId);
    if (!conv) return;

    const nameEl = document.getElementById('participantName');
    const statusEl = document.getElementById('participantStatus');
    const avatarEl = document.getElementById('participantAvatar');

    if (nameEl) nameEl.textContent = conv.creator_name || 'Unknown';
    if (statusEl) statusEl.textContent = 'Active now'; // Would need real status
    if (avatarEl) avatarEl.src = '/images/default-avatar.png'; // Would need real avatar
  }

  updateParticipantStatus(userId, status) {
    if (this.currentConversationId) {
      const conv = this.conversations.find(c => c.id === this.currentConversationId);
      if (conv && conv.creator_id === userId) {
        const statusEl = document.getElementById('participantStatus');
        if (statusEl) {
          statusEl.textContent = status === 'online' ? 'Active now' : 'Offline';
        }
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTimeAgo(date) {
    if (!date) return '';

    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';

    return 'just now';
  }

  showError(message) {
    // Create a simple error toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }
}

// Initialize chat manager when DOM is ready
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
  chatManager = new ChatManager();
});
