/**
 * Session Keeper
 * Automatically refreshes session to prevent timeout during user activity
 * Also monitors session status and handles disconnections gracefully
 */

class SessionKeeper {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // Check every 5 minutes
    this.warningThreshold = options.warningThreshold || 2 * 60 * 1000; // Warn 2 minutes before expiry
    this.isEnabled = true;
    this.timerId = null;
    this.lastChecked = null;
    this.sessionChecks = 0;
    
    // Callbacks
    this.onSessionValid = options.onSessionValid || (() => {});
    this.onSessionInvalid = options.onSessionInvalid || (() => {});
    this.onSessionWarning = options.onSessionWarning || (() => {});
    
    this.init();
  }

  init() {
    // Start the periodic check
    this.startPeriodicCheck();

    // Also refresh on user activity
    this.setupActivityListeners();

    console.log('SessionKeeper initialized');
  }

  /**
   * Start periodic session checks
   */
  startPeriodicCheck() {
    this.timerId = setInterval(() => {
      this.checkAndRefreshSession();
    }, this.checkInterval);
  }

  /**
   * Setup listeners for user activity (mouse, keyboard, etc.)
   * Refresh session on activity to keep user logged in
   */
  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    let activityTimeout;

    const recordActivity = () => {
      clearTimeout(activityTimeout);
      
      // Refresh session on activity (debounced - every 30 seconds of inactivity)
      activityTimeout = setTimeout(() => {
        this.refreshSession();
      }, 30000);
    };

    events.forEach(event => {
      document.addEventListener(event, recordActivity, { passive: true });
    });
  }

  /**
   * Check current session status and refresh if valid
   */
  async checkAndRefreshSession() {
    try {
      const response = await fetch('/api/session/check', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      this.lastChecked = new Date();
      this.sessionChecks++;

      if (data.authenticated) {
        this.onSessionValid(data);
        console.log(`[SessionKeeper] Session valid (check #${this.sessionChecks})`);
      } else {
        this.handleSessionInvalid();
      }
    } catch (error) {
      console.error('[SessionKeeper] Error checking session:', error);
      // Don't invalidate on network errors - could be temporary
    }
  }

  /**
   * Explicitly refresh the session
   */
  async refreshSession() {
    if (!this.isEnabled) return;

    try {
      const response = await fetch('/api/session/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.authenticated) {
        console.log('[SessionKeeper] Session refreshed successfully');
        return true;
      } else {
        this.handleSessionInvalid();
        return false;
      }
    } catch (error) {
      console.error('[SessionKeeper] Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Handle invalid session
   */
  handleSessionInvalid() {
    console.warn('[SessionKeeper] Session is invalid or expired');
    this.onSessionInvalid();

    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/?loginRequired=true&sessionExpired=true';
    }, 2000);
  }

  /**
   * Disable session keeper (e.g., on logout)
   */
  disable() {
    this.isEnabled = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    console.log('SessionKeeper disabled');
  }

  /**
   * Enable session keeper
   */
  enable() {
    this.isEnabled = true;
    this.startPeriodicCheck();
    console.log('SessionKeeper enabled');
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      lastChecked: this.lastChecked,
      checksPerformed: this.sessionChecks,
      checkInterval: this.checkInterval
    };
  }
}

// Initialize globally when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is authenticated (check if currentUser exists)
    if (window.currentUser) {
      window.sessionKeeper = new SessionKeeper({
        checkInterval: 5 * 60 * 1000, // 5 minutes
        onSessionInvalid: () => {
          // Show notification if needed
          if (window.showNotification) {
            window.showNotification('Your session has expired. Please log in again.', 'error');
          }
        }
      });
    }
  });
} else {
  // DOM already loaded
  if (window.currentUser) {
    window.sessionKeeper = new SessionKeeper({
      checkInterval: 5 * 60 * 1000,
      onSessionInvalid: () => {
        if (window.showNotification) {
          window.showNotification('Your session has expired. Please log in again.', 'error');
        }
      }
    });
  }
}
