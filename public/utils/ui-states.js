/**
 * UI States Utilities - Loading and Empty States
 * Provides reusable components for better UX
 */

/**
 * Show loading state in a container
 * @param {string|HTMLElement} container - Container selector or element
 * @param {string} message - Loading message
 */
function showLoadingState(container, message = 'Loading...') {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  element.innerHTML = `
    <div class="loading-state" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p class="loading-message">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Show empty state in a container
 * @param {string|HTMLElement} container - Container selector or element
 * @param {Object} options - Empty state options
 */
function showEmptyState(container, options = {}) {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  const {
    icon = '📭',
    title = 'No data available',
    message = 'There are no items to display at the moment.',
    actionText = null,
    actionCallback = null
  } = options;

  let actionButton = '';
  if (actionText && actionCallback) {
    const actionId = 'empty-state-action-' + Date.now();
    actionButton = `
      <button class="btn btn-primary" id="${actionId}" aria-label="${escapeHtml(actionText)}">
        ${escapeHtml(actionText)}
      </button>
    `;

    // Set callback after rendering
    setTimeout(() => {
      const btn = document.getElementById(actionId);
      if (btn) btn.onclick = actionCallback;
    }, 0);
  }

  element.innerHTML = `
    <div class="empty-state" role="status">
      <div class="empty-state-icon" aria-hidden="true">${icon}</div>
      <h3 class="empty-state-title">${escapeHtml(title)}</h3>
      <p class="empty-state-message">${escapeHtml(message)}</p>
      ${actionButton}
    </div>
  `;
}

/**
 * Show error state in a container
 * @param {string|HTMLElement} container - Container selector or element
 * @param {Object} options - Error state options
 */
function showErrorState(container, options = {}) {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  const {
    title = 'Error',
    message = 'Something went wrong. Please try again.',
    retryCallback = null
  } = options;

  let retryButton = '';
  if (retryCallback) {
    const retryId = 'error-state-retry-' + Date.now();
    retryButton = `
      <button class="btn btn-secondary" id="${retryId}" aria-label="Try again">
        🔄 Try Again
      </button>
    `;

    setTimeout(() => {
      const btn = document.getElementById(retryId);
      if (btn) btn.onclick = retryCallback;
    }, 0);
  }

  element.innerHTML = `
    <div class="error-state" role="alert">
      <div class="error-state-icon" aria-hidden="true">⚠️</div>
      <h3 class="error-state-title">${escapeHtml(title)}</h3>
      <p class="error-state-message">${escapeHtml(message)}</p>
      ${retryButton}
    </div>
  `;
}

/**
 * Show skeleton loader for cards/lists
 * @param {string|HTMLElement} container - Container selector or element
 * @param {number} count - Number of skeleton items
 */
function showSkeletonLoader(container, count = 3) {
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) return;

  const skeletons = Array.from({ length: count }, (_, i) => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-header"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join('');

  element.innerHTML = `
    <div class="skeleton-loader" role="status" aria-live="polite" aria-label="Loading content">
      ${skeletons}
    </div>
  `;
}

/**
 * Create a progress indicator
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @returns {string} Progress bar HTML
 */
function createProgressBar(current, total) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));

  return `
    <div class="progress-container" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar" style="width: ${percentage}%"></div>
      <span class="progress-text">${current} / ${total}</span>
    </div>
  `;
}

/**
 * Helper: Safe HTML escape (reuse from dashboard-interactive.js)
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showLoadingState,
    showEmptyState,
    showErrorState,
    showSkeletonLoader,
    createProgressBar
  };
}
