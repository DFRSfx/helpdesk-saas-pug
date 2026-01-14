/**
 * Real-time Notifications Handler
 * Listens for notification events via Socket.IO and updates the UI
 */

// Listen for new notifications from Socket.IO
socket.on('notification:new', (notification) => {
  console.log('🔔 New notification received:', notification);
  
  // Add to notification dropdown
  addNotificationToDropdown(notification);
  
  // Update unread count
  updateUnreadCount();
  
  // Show browser notification if enabled
  showBrowserNotification(notification);
});

// Listen for notification read event
socket.on('notification:read', (data) => {
  console.log('✅ Notification marked as read:', data.id);
  updateUnreadCount();
});

// Listen for notification deleted event
socket.on('notification:deleted', (data) => {
  console.log('🗑️ Notification deleted:', data.id);
  removeNotificationFromDropdown(data.id);
  updateUnreadCount();
});

// Listen for all notifications marked as read
socket.on('notifications:all-read', () => {
  console.log('📋 All notifications marked as read');
  updateUnreadCount();
});

/**
 * Add notification to dropdown
 */
function addNotificationToDropdown(notification) {
  const notificationsList = document.getElementById('notificationsList');
  if (!notificationsList) return;
  
  // Remove empty state if it exists
  const emptyState = notificationsList.querySelector('.text-center');
  if (emptyState) {
    emptyState.remove();
  }
  
  // Create notification element
  const notificationEl = createNotificationElement(notification);
  notificationsList.insertBefore(notificationEl, notificationsList.firstChild);
}

/**
 * Create notification DOM element
 */
function createNotificationElement(notification) {
  const div = document.createElement('div');
  div.className = 'px-4 py-3 border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer notification-item';
  div.setAttribute('data-notification-id', notification.id);
  
  const icon = getNotificationIcon(notification.type);
  const time = formatTimeAgo(new Date(notification.created_at));
  
  div.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-1">
        ${icon}
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">${notification.title}</h4>
        <p class="text-sm text-gray-600 dark:text-neutral-400 mt-1 line-clamp-2">${notification.message}</p>
        <p class="text-xs text-gray-500 dark:text-neutral-500 mt-2">${time}</p>
      </div>
      ${!notification.is_read ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>' : ''}
    </div>
  `;
  
  // Click to mark as read
  div.addEventListener('click', () => {
    markNotificationAsRead(notification.id);
  });
  
  return div;
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
  const icons = {
    chat_message: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-600 dark:text-blue-400',
      path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    ticket_assigned: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-600 dark:text-green-400',
      path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    ticket_status_change: {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-600 dark:text-purple-400',
      path: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    escalation: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-600 dark:text-orange-400',
      path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  };
  
  const config = icons[type] || icons.chat_message;
  
  return `
    <div class="p-2 ${config.bg} rounded-lg">
      <svg class="w-5 h-5 ${config.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.path}"></path>
      </svg>
    </div>
  `;
}

/**
 * Mark notification as read
 */
function markNotificationAsRead(notificationId) {
  fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' })
    .then(res => res.json())
    .then(() => {
      const notificationEl = document.querySelector(`[data-notification-id="${notificationId}"]`);
      if (notificationEl) {
        // Remove unread indicator
        const indicator = notificationEl.querySelector('.w-2.h-2');
        if (indicator) indicator.remove();
      }
      updateUnreadCount();
    })
    .catch(err => console.error('Error marking notification as read:', err));
}

/**
 * Remove notification from dropdown
 */
function removeNotificationFromDropdown(notificationId) {
  const notificationEl = document.querySelector(`[data-notification-id="${notificationId}"]`);
  if (notificationEl) {
    notificationEl.remove();
  }
}

/**
 * Update unread notification count
 */
function updateUnreadCount() {
  fetch('/api/notifications/unread-count')
    .then(res => res.json())
    .then(data => {
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        if (data.count > 0) {
          badge.textContent = data.count > 99 ? '99+' : data.count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    })
    .catch(err => console.error('Error fetching unread count:', err));
}

/**
 * Show browser notification
 */
function showBrowserNotification(notification) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
      tag: `notification-${notification.id}`
    });
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
}

/**
 * Initialize notifications on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Update unread count
  updateUnreadCount();
  
  // Request browser notification permission only on user interaction
  const notificationBell = document.getElementById('notificationBell');
  if (notificationBell && 'Notification' in window && Notification.permission === 'default') {
    notificationBell.addEventListener('click', () => {
      Notification.requestPermission();
    }, { once: true });
  }
});
