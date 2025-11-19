// Initialize Socket.io
const socket = io();

// Auto-hide flash messages
document.addEventListener('DOMContentLoaded', () => {
  const flashMessages = document.querySelectorAll('.flash-message');
  flashMessages.forEach(message => {
    setTimeout(() => {
      message.style.transition = 'opacity 0.5s ease-out';
      message.style.opacity = '0';
      setTimeout(() => message.remove(), 500);
    }, 5000);
  });
});

// Close flash message manually
function closeFlashMessage(element) {
  element.parentElement.style.transition = 'opacity 0.5s ease-out';
  element.parentElement.style.opacity = '0';
  setTimeout(() => element.parentElement.remove(), 500);
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
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 flash-message`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transition = 'opacity 0.5s ease-out';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 500);
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
