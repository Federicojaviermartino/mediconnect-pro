/**
 * Accessibility Utilities - WCAG AA Compliance
 * Provides helpers for accessible web applications
 */

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
function announceToScreenReader(message, priority = 'polite') {
  // Find or create live region
  let liveRegion = document.getElementById('sr-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }

  // Update priority if different
  if (liveRegion.getAttribute('aria-live') !== priority) {
    liveRegion.setAttribute('aria-live', priority);
  }

  // Clear and set new message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);
}

/**
 * Manage focus trap for modals
 * @param {HTMLElement} container - Container element
 * @returns {Object} Focus trap controller
 */
function createFocusTrap(container) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let previouslyFocusedElement = null;

  function getFocusableElements() {
    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    }
    // Tab
    else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  return {
    activate() {
      previouslyFocusedElement = document.activeElement;
      container.addEventListener('keydown', handleKeyDown);

      // Focus first element
      const firstFocusable = getFocusableElements()[0];
      if (firstFocusable) {
        firstFocusable.focus();
      }
    },

    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
    }
  };
}

/**
 * Add skip navigation link
 */
function addSkipNavigation() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-nav';
  skipLink.textContent = 'Skip to main content';

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.removeAttribute('tabindex');
    }
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Enhance button accessibility
 * @param {HTMLElement} button - Button element
 * @param {Object} options - Accessibility options
 */
function enhanceButtonAccessibility(button, options = {}) {
  const {
    label,
    describedBy,
    expanded,
    controls,
    pressed
  } = options;

  if (label) {
    button.setAttribute('aria-label', label);
  }

  if (describedBy) {
    button.setAttribute('aria-describedby', describedBy);
  }

  if (expanded !== undefined) {
    button.setAttribute('aria-expanded', String(expanded));
  }

  if (controls) {
    button.setAttribute('aria-controls', controls);
  }

  if (pressed !== undefined) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}

/**
 * Add keyboard navigation to a list
 * @param {HTMLElement} container - List container
 * @param {string} itemSelector - Selector for list items
 */
function addKeyboardListNavigation(container, itemSelector) {
  const items = Array.from(container.querySelectorAll(itemSelector));

  container.addEventListener('keydown', (e) => {
    const currentIndex = items.indexOf(document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        }
        break;

      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;

      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
    }
  });

  // Make items focusable
  items.forEach((item, index) => {
    if (!item.hasAttribute('tabindex')) {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    }
  });
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 * @param {string} foreground - Foreground color (hex or rgb)
 * @param {string} background - Background color (hex or rgb)
 * @returns {number} Contrast ratio
 */
function getContrastRatio(foreground, background) {
  const getLuminance = (color) => {
    const rgb = color.match(/\d+/g).map(Number);
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Add ARIA labels to unlabeled inputs
 */
function auditFormAccessibility(form) {
  const issues = [];

  // Check all inputs have labels
  form.querySelectorAll('input, select, textarea').forEach(input => {
    const hasLabel = input.getAttribute('aria-label') ||
                     input.getAttribute('aria-labelledby') ||
                     form.querySelector(`label[for="${input.id}"]`);

    if (!hasLabel) {
      issues.push({
        element: input,
        issue: 'Input missing label',
        severity: 'error'
      });
    }
  });

  // Check buttons have accessible names
  form.querySelectorAll('button').forEach(button => {
    const hasName = button.textContent.trim() ||
                    button.getAttribute('aria-label') ||
                    button.getAttribute('aria-labelledby');

    if (!hasName) {
      issues.push({
        element: button,
        issue: 'Button missing accessible name',
        severity: 'error'
      });
    }
  });

  return issues;
}

/**
 * Add ARIA landmarks if missing
 */
function ensureARIALandmarks() {
  const main = document.querySelector('main');
  if (main && !main.getAttribute('role')) {
    main.setAttribute('role', 'main');
  }

  const nav = document.querySelector('nav');
  if (nav && !nav.getAttribute('role')) {
    nav.setAttribute('role', 'navigation');
  }

  const header = document.querySelector('header');
  if (header && !header.getAttribute('role')) {
    header.setAttribute('role', 'banner');
  }

  const footer = document.querySelector('footer');
  if (footer && !footer.getAttribute('role')) {
    footer.setAttribute('role', 'contentinfo');
  }
}

/**
 * Manage document title for SPA navigation
 * @param {string} pageTitle - Page title
 */
function updateDocumentTitle(pageTitle) {
  const appName = 'MediConnect Pro';
  document.title = pageTitle ? `${pageTitle} - ${appName}` : appName;

  // Announce page change to screen readers
  announceToScreenReader(`Navigated to ${pageTitle}`, 'polite');
}

/**
 * Initialize accessibility features
 */
function initAccessibility() {
  // Add skip navigation
  addSkipNavigation();

  // Ensure ARIA landmarks
  ensureARIALandmarks();

  // Add ESC key handler for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.active');
      if (openModal) {
        const closeBtn = openModal.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
      }
    }
  });
}

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    announceToScreenReader,
    createFocusTrap,
    addSkipNavigation,
    enhanceButtonAccessibility,
    addKeyboardListNavigation,
    getContrastRatio,
    auditFormAccessibility,
    ensureARIALandmarks,
    updateDocumentTitle,
    initAccessibility
  };
}
