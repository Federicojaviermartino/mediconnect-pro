/**
 * Form Validation Utilities
 * Client-side validation with accessibility support
 */

/**
 * Validation rules
 */
const ValidationRules = {
  required: (value) => ({
    valid: value && value.trim() !== '',
    message: 'This field is required'
  }),

  email: (value) => ({
    valid: !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Please enter a valid email address'
  }),

  password: (value) => ({
    valid: !value || value.length >= 8,
    message: 'Password must be at least 8 characters long'
  }),

  passwordStrength: (value) => ({
    valid: !value || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value),
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  }),

  minLength: (min) => (value) => ({
    valid: !value || value.length >= min,
    message: `Must be at least ${min} characters long`
  }),

  maxLength: (max) => (value) => ({
    valid: !value || value.length <= max,
    message: `Must not exceed ${max} characters`
  }),

  pattern: (regex, message) => (value) => ({
    valid: !value || regex.test(value),
    message: message || 'Invalid format'
  }),

  number: (value) => ({
    valid: !value || !isNaN(value),
    message: 'Please enter a valid number'
  }),

  min: (minimum) => (value) => ({
    valid: !value || parseFloat(value) >= minimum,
    message: `Value must be at least ${minimum}`
  }),

  max: (maximum) => (value) => ({
    valid: !value || parseFloat(value) <= maximum,
    message: `Value must not exceed ${maximum}`
  }),

  date: (value) => ({
    valid: !value || !isNaN(Date.parse(value)),
    message: 'Please enter a valid date'
  }),

  futureDate: (value) => ({
    valid: !value || new Date(value) >= new Date(),
    message: 'Date must be in the future'
  }),

  match: (otherFieldId, label) => (value) => {
    const otherField = document.getElementById(otherFieldId);
    const otherValue = otherField ? otherField.value : '';
    return {
      valid: value === otherValue,
      message: `Must match ${label || 'the other field'}`
    };
  }
};

/**
 * Validate a single field
 * @param {HTMLElement} field - Input field element
 * @param {Array} rules - Array of validation rules
 * @returns {Object} Validation result
 */
function validateField(field, rules) {
  const value = field.value;
  const fieldName = field.getAttribute('aria-label') || field.name || 'This field';

  for (const rule of rules) {
    const result = rule(value);
    if (!result.valid) {
      return {
        valid: false,
        message: result.message,
        field: field
      };
    }
  }

  return { valid: true, field: field };
}

/**
 * Show validation error
 * @param {HTMLElement} field - Input field
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
  // Remove existing error
  clearFieldError(field);

  // Mark field as invalid
  field.classList.add('invalid');
  field.setAttribute('aria-invalid', 'true');

  // Create error message
  const errorId = `${field.id || field.name}-error`;
  const errorElement = document.createElement('div');
  errorElement.id = errorId;
  errorElement.className = 'field-error';
  errorElement.setAttribute('role', 'alert');
  errorElement.textContent = message;

  // Insert error after field (or after field container if exists)
  const container = field.closest('.form-group') || field.parentElement;
  container.appendChild(errorElement);

  // Link error to field for screen readers
  field.setAttribute('aria-describedby', errorId);

  // Focus field
  field.focus();
}

/**
 * Clear validation error
 * @param {HTMLElement} field - Input field
 */
function clearFieldError(field) {
  field.classList.remove('invalid');
  field.removeAttribute('aria-invalid');

  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement && errorElement.classList.contains('field-error')) {
      errorElement.remove();
    }
    field.removeAttribute('aria-describedby');
  }
}

/**
 * Validate entire form
 * @param {HTMLFormElement} form - Form element
 * @param {Object} validationRules - Validation rules for each field
 * @returns {boolean} Form validity
 */
function validateForm(form, validationRules) {
  let isValid = true;
  let firstInvalidField = null;

  // Clear all previous errors
  form.querySelectorAll('.invalid').forEach(field => clearFieldError(field));

  // Validate each field
  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const field = form.elements[fieldName];
    if (!field) continue;

    const result = validateField(field, rules);

    if (!result.valid) {
      showFieldError(field, result.message);
      isValid = false;

      if (!firstInvalidField) {
        firstInvalidField = field;
      }
    }
  }

  // Focus first invalid field
  if (firstInvalidField) {
    firstInvalidField.focus();
  }

  return isValid;
}

/**
 * Add real-time validation to a field
 * @param {HTMLElement} field - Input field
 * @param {Array} rules - Validation rules
 */
function addRealtimeValidation(field, rules) {
  field.addEventListener('blur', () => {
    const result = validateField(field, rules);
    if (!result.valid) {
      showFieldError(field, result.message);
    } else {
      clearFieldError(field);
    }
  });

  field.addEventListener('input', () => {
    // Clear error on input if field was invalid
    if (field.classList.contains('invalid')) {
      const result = validateField(field, rules);
      if (result.valid) {
        clearFieldError(field);
      }
    }
  });
}

/**
 * Setup form validation
 * @param {string|HTMLFormElement} formSelector - Form selector or element
 * @param {Object} validationRules - Validation rules
 * @param {Function} onSuccess - Success callback
 */
function setupFormValidation(formSelector, validationRules, onSuccess) {
  const form = typeof formSelector === 'string'
    ? document.querySelector(formSelector)
    : formSelector;

  if (!form) return;

  // Add real-time validation to all fields
  for (const [fieldName, rules] of Object.entries(validationRules)) {
    const field = form.elements[fieldName];
    if (field) {
      addRealtimeValidation(field, rules);
    }
  }

  // Validate on submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (validateForm(form, validationRules)) {
      onSuccess(form);
    }
  });
}

/**
 * Get password strength
 * @param {string} password - Password to check
 * @returns {Object} Strength info
 */
function getPasswordStrength(password) {
  let strength = 0;
  const feedback = [];

  if (!password) {
    return { strength: 0, label: 'None', feedback: [] };
  }

  // Length check
  if (password.length >= 8) strength += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) strength += 1;

  // Character variety
  if (/[a-z]/.test(password)) strength += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) strength += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) strength += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z\d]/.test(password)) strength += 1;

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const label = labels[Math.min(strength, 5)];

  return {
    strength: Math.min(strength, 5),
    label,
    feedback,
    percentage: (strength / 5) * 100
  };
}

/**
 * Show password strength indicator
 * @param {HTMLElement} passwordField - Password input field
 * @param {HTMLElement} container - Container for strength indicator
 */
function showPasswordStrength(passwordField, container) {
  passwordField.addEventListener('input', () => {
    const strength = getPasswordStrength(passwordField.value);

    if (!passwordField.value) {
      container.innerHTML = '';
      return;
    }

    const strengthClass = ['weak', 'weak', 'fair', 'good', 'strong', 'very-strong'][strength.strength];

    container.innerHTML = `
      <div class="password-strength ${strengthClass}">
        <div class="password-strength-bar">
          <div class="password-strength-fill" style="width: ${strength.percentage}%"></div>
        </div>
        <div class="password-strength-label">${strength.label}</div>
      </div>
    `;
  });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ValidationRules,
    validateField,
    validateForm,
    showFieldError,
    clearFieldError,
    addRealtimeValidation,
    setupFormValidation,
    getPasswordStrength,
    showPasswordStrength
  };
}
