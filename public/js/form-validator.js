/**
 * FormValidator - Real-time form validation with inline error messages
 *
 * Usage:
 *   new FormValidator('#myForm');
 *
 * Field validation: Add data-validate attribute with rules separated by |
 *   data-validate="required|email"
 *   data-validate="required|minLength:6"
 *   data-validate="required|match:passwordFieldId"
 *
 * Error messages: Add an error container with class 'error-message hidden' after each field
 *   <p class="error-message hidden text-xs text-red-600 mt-1"></p>
 */

class FormValidator {
  constructor(formSelector, options = {}) {
    this.form = document.querySelector(formSelector);
    if (!this.form) {
      console.error(`Form not found: ${formSelector}`);
      return;
    }

    this.options = {
      validateOn: 'input', // 'input', 'blur', or 'change'
      ...options
    };

    this.fields = {};
    this.init();
  }

  /**
   * Validation rule definitions
   */
  static rules = {
    required: {
      validate: (value) => value.trim() !== '',
      message: 'This field is required'
    },
    email: {
      validate: (value) => {
        if (value.trim() === '') return true; // Skip if empty (use required rule for mandatory)
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Please enter a valid email address'
    },
    minLength: {
      validate: (value, param) => value.length >= parseInt(param),
      message: (param) => `This field must be at least ${param} characters`
    },
    maxLength: {
      validate: (value, param) => value.length <= parseInt(param),
      message: (param) => `This field must not exceed ${param} characters`
    },
    pattern: {
      validate: (value, param) => {
        if (value.trim() === '') return true;
        return new RegExp(param).test(value);
      },
      message: 'This field format is invalid'
    },
    match: {
      validate: (value, fieldId) => {
        const matchField = document.getElementById(fieldId);
        if (!matchField) return true;
        return value === matchField.value;
      },
      message: (fieldId) => {
        const matchField = document.getElementById(fieldId);
        const label = matchField?.getAttribute('data-label') || 'password';
        return `This field must match the ${label}`;
      }
    },
    conditionalMatch: {
      validate: (value, fieldId) => {
        const matchField = document.getElementById(fieldId);
        if (!matchField) return true;
        // If the field we're matching against is empty, this field can also be empty
        if (matchField.value.trim() === '') return true;
        // If the field we're matching against has a value, this field must match it
        return value === matchField.value;
      },
      message: (fieldId) => {
        const matchField = document.getElementById(fieldId);
        const label = matchField?.getAttribute('data-label') || 'password';
        return `This field must match the ${label}`;
      }
    },
    conditionalMinLength: {
      validate: (value, params) => {
        // params is "6:confirm_new_password" (minLength:targetFieldId)
        const [minLen, fieldId] = params.split(':');
        const targetField = document.getElementById(fieldId);

        if (!targetField) return true;

        // If target field (confirm password) is empty, this field can be empty
        if (targetField.value.trim() === '') return true;

        // If target field has content, this field is required and must meet minLength
        if (value.trim() === '') return false;
        return value.length >= parseInt(minLen);
      },
      message: (params) => {
        const [minLen] = params.split(':');
        return `This field must be at least ${minLen} characters`;
      }
    }
  };

  /**
   * Initialize the validator
   */
  init() {
    this.findFields();
    this.attachEventListeners();
  }

  /**
   * Find all fields with data-validate attribute
   */
  findFields() {
    const inputs = this.form.querySelectorAll('[data-validate]');
    inputs.forEach(field => {
      const rules = field.getAttribute('data-validate');
      this.fields[field.id] = {
        element: field,
        rules: this.parseRules(rules),
        errorContainer: field.parentElement.querySelector('.error-message') || this.createErrorContainer(field)
      };
    });
  }

  /**
   * Create error message container if it doesn't exist
   */
  createErrorContainer(field) {
    const container = document.createElement('p');
    container.className = 'error-message hidden text-xs text-red-600 mt-1';
    field.parentElement.appendChild(container);
    return container;
  }

  /**
   * Parse validation rules from string
   * Example: "required|email|minLength:6" -> [{rule: 'required'}, {rule: 'minLength', param: '6'}, ...]
   */
  parseRules(rulesString) {
    return rulesString.split('|').map(rule => {
      const [ruleName, param] = rule.split(':');
      return { rule: ruleName.trim(), param: param?.trim() };
    });
  }

  /**
   * Attach event listeners to fields
   */
  attachEventListeners() {
    Object.values(this.fields).forEach(field => {
      field.element.addEventListener('input', () => this.validateField(field.element.id));
      field.element.addEventListener('blur', () => this.validateField(field.element.id));
      field.element.addEventListener('change', () => this.validateField(field.element.id));
    });

    // Prevent form submission if validation fails
    this.form.addEventListener('submit', (e) => {
      if (!this.validateForm()) {
        e.preventDefault();
      }
    });
  }

  /**
   * Validate a single field
   */
  validateField(fieldId) {
    const field = this.fields[fieldId];
    if (!field) return true;

    const element = field.element;
    const value = element.value;
    const rules = field.rules;

    // Check each validation rule
    for (const { rule, param } of rules) {
      const ruleConfig = FormValidator.rules[rule];

      if (!ruleConfig) {
        console.warn(`Unknown validation rule: ${rule}`);
        continue;
      }

      const isValid = ruleConfig.validate(value, param);

      if (!isValid) {
        this.showError(
          fieldId,
          typeof ruleConfig.message === 'function'
            ? ruleConfig.message(param)
            : ruleConfig.message
        );
        return false;
      }
    }

    this.clearError(fieldId);
    return true;
  }

  /**
   * Validate entire form
   */
  validateForm() {
    let isValid = true;
    Object.keys(this.fields).forEach(fieldId => {
      if (!this.validateField(fieldId)) {
        isValid = false;
      }
    });
    return isValid;
  }

  /**
   * Show error message and add error styling
   */
  showError(fieldId, message) {
    const field = this.fields[fieldId];
    if (!field) return;

    const element = field.element;
    const errorContainer = field.errorContainer;

    // Add error styling to input
    element.classList.add('error');
    element.classList.remove('valid');

    // Display error message
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
  }

  /**
   * Clear error message and remove error styling
   */
  clearError(fieldId) {
    const field = this.fields[fieldId];
    if (!field) return;

    const element = field.element;
    const errorContainer = field.errorContainer;

    // Remove error styling
    element.classList.remove('error');
    element.classList.add('valid');

    // Hide error message
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
  }

  /**
   * Manually validate a field (useful for custom validation)
   */
  addCustomRule(fieldId, ruleName, validateFn, message) {
    FormValidator.rules[ruleName] = {
      validate: validateFn,
      message: message
    };
  }

  /**
   * Reset form and clear all errors
   */
  reset() {
    this.form.reset();
    Object.keys(this.fields).forEach(fieldId => {
      this.clearError(fieldId);
    });
  }
}

// Auto-initialize forms with data-form-validate attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-form-validate]').forEach(form => {
    new FormValidator(`#${form.id || form.className.split(' ')[0]}`);
  });
});
