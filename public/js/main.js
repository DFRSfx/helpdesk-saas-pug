// Initialize Socket.io
const socket = io();

// Auto-hide flash messages
document.addEventListener('DOMContentLoaded', () => {
  const flashMessages = document.querySelectorAll('.flash-message');
  flashMessages.forEach((message, index) => {
    // Add slide-in animation with stagger
    message.style.transform = 'translateX(100%)';
    message.style.opacity = '0';
    setTimeout(() => {
      message.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      message.style.transform = 'translateX(0)';
      message.style.opacity = '1';
    }, 100 + (index * 100));

    // Auto-hide after 5 seconds
    setTimeout(() => {
      message.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      message.style.transform = 'translateX(100%)';
      message.style.opacity = '0';
      setTimeout(() => message.remove(), 300);
    }, 5000 + (index * 100));
  });
});

// Close flash message manually
function closeFlashMessage(element) {
  const message = element.parentElement;
  message.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
  message.style.transform = 'translateX(100%)';
  message.style.opacity = '0';
  setTimeout(() => message.remove(), 300);
}

// Confirmation dialog for destructive actions
function confirmAction(message) {
  return confirm(message || 'Are you sure you want to perform this action?');
}

// Format date helper
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('hidden');
}

// File upload preview
function previewFile(input) {
  const preview = document.getElementById('file-preview');
  const file = input.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${e.target.result}" class="max-w-xs rounded-lg" alt="Preview">`;
      } else {
        preview.innerHTML = `<p class="text-gray-600">File selected: ${file.name}</p>`;
      }
    };
    reader.readAsDataURL(file);
  }
}

// Socket.io real-time updates
socket.on('ticket:created', (data) => {
  showNotification('New ticket created: ' + data.title, 'info');
  // Refresh ticket list if on tickets page
  if (window.location.pathname.includes('/tickets')) {
    location.reload();
  }
});

socket.on('ticket:updated', (data) => {
  showNotification('Ticket updated: ' + data.title, 'info');
  // Update specific ticket if viewing it
  if (window.location.pathname.includes('/tickets/' + data.id)) {
    location.reload();
  }
});

socket.on('ticket:assigned', (data) => {
  showNotification('You have been assigned ticket: ' + data.title, 'success');
});

socket.on('message:new', (data) => {
  showNotification('New message on ticket: ' + data.ticketTitle, 'info');
  // Reload if viewing the ticket
  if (window.location.pathname.includes('/tickets/' + data.ticketId)) {
    location.reload();
  }
});

// Show notification
function showNotification(message, type = 'info') {
  const iconColors = {
    success: { bg: 'bg-green-100', text: 'text-green-600', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    error: { bg: 'bg-red-100', text: 'text-red-600', path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    info: { bg: 'bg-blue-100', text: 'text-blue-600', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-600', path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
  };

  const config = iconColors[type] || iconColors.info;

  // Create or get notification container
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = 'position: fixed; top: 50%; right: 1rem; transform: translateY(-50%); z-index: 50; display: flex; flex-direction: column; gap: 0.75rem;';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = 'flash-message bg-white border border-gray-200 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between max-w-sm';
  notification.style.cssText = 'transform: translateX(100%); opacity: 0;';

  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 ${config.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.path}"></path>
        </svg>
      </div>
      <span class="text-sm text-gray-900">${message}</span>
    </div>
    <button class="ml-3 text-gray-400 hover:text-gray-600" onclick="closeFlashMessage(this)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  container.appendChild(notification);

  // Slide in animation
  setTimeout(() => {
    notification.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 100);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
      // Remove container if empty
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 5000);
}

// Markdown preview toggle (if using markdown)
function toggleMarkdownPreview() {
  const textarea = document.getElementById('message-textarea');
  const preview = document.getElementById('markdown-preview');

  if (preview.classList.contains('hidden')) {
    // Show preview
    preview.innerHTML = marked.parse(textarea.value);
    preview.classList.remove('hidden');
    textarea.classList.add('hidden');
  } else {
    // Show textarea
    preview.classList.add('hidden');
    textarea.classList.remove('hidden');
  }
}
