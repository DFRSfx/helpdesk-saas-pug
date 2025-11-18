/**
 * Main JavaScript for SupportDesk Pro
 * Handles client-side interactions and enhancements
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Auto-hide flash messages after 5 seconds
  const flashMessages = document.querySelectorAll('[role="alert"]');
  flashMessages.forEach(message => {
    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => message.remove(), 300);
    }, 5000);
  });

  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (mobileMenuToggle && sidebar && mobileOverlay) {
    mobileMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      mobileOverlay.classList.toggle('hidden');
    });

    mobileOverlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      mobileOverlay.classList.add('hidden');
    });
  }

  // File upload preview
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        const fileList = Array.from(files).map(f => f.name).join(', ');
        console.log('Files selected:', fileList);
        
        // Show file names (you can enhance this with a better UI)
        const label = input.parentElement.querySelector('label p');
        if (label) {
          label.textContent = `${files.length} file(s) selected`;
        }
      }
    });
  });

  // Confirm delete actions
  const deleteButtons = document.querySelectorAll('[data-confirm-delete]');
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });

  // Auto-grow textarea
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });

  // Search functionality
  const searchInput = document.querySelector('input[type="search"]');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
          window.location.href = `/tickets?search=${encodeURIComponent(searchTerm)}`;
        }
      }
    });
  }

  // Notification bell animation
  const notificationBtn = document.getElementById('notifications-btn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      // TODO: Implement notification dropdown
      console.log('Notifications clicked');
    });
  }

  // Status color coding
  const statusBadges = document.querySelectorAll('.status-badge');
  statusBadges.forEach(badge => {
    const status = badge.textContent.toLowerCase().trim();
    badge.classList.add('status-' + status);
  });

  // Smooth scroll to top
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.remove('hidden');
      } else {
        scrollToTopBtn.classList.add('hidden');
      }
    });

    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Copy ticket number to clipboard
  const ticketNumbers = document.querySelectorAll('[data-ticket-number]');
  ticketNumbers.forEach(element => {
    element.addEventListener('click', function() {
      const ticketNumber = this.getAttribute('data-ticket-number');
      navigator.clipboard.writeText(ticketNumber).then(() => {
        // Show temporary success message
        const originalText = this.textContent;
        this.textContent = 'Copied!';
        setTimeout(() => {
          this.textContent = originalText;
        }, 2000);
      });
    });
  });

  // Initialize tooltips (if using a tooltip library)
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(element => {
    element.setAttribute('title', element.getAttribute('data-tooltip'));
  });

  console.log('SupportDesk Pro initialized ✓');
});

// Utility function: Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Utility function: Time ago
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

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
  
  return 'Just now';
}

// Export utilities
window.SupportDesk = {
  formatDate,
  timeAgo
};
