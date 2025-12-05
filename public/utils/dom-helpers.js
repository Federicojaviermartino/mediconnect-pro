// DOM Helper Functions for XSS Prevention
// Use these functions instead of innerHTML with template literals

/**
 * Safely create a text node (always safe from XSS)
 * @param {string} text - Text content
 * @returns {Text} DOM text node
 */
function createTextNode(text) {
  return document.createTextNode(text || '');
}

/**
 * Safely create an element with text content
 * @param {string} tagName - Element tag name (e.g., 'div', 'span')
 * @param {string} text - Text content
 * @param {string} className - Optional CSS class
 * @returns {HTMLElement} DOM element
 */
function createElement(tagName, text, className) {
  const el = document.createElement(tagName);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}

/**
 * Safely create a table row with cells
 * @param {Array<{text: string, className?: string}>} cells - Array of cell data
 * @returns {HTMLTableRowElement} Table row element
 */
function createTableRow(cells) {
  const tr = document.createElement('tr');
  cells.forEach(cell => {
    const td = document.createElement('td');
    if (cell.className) td.className = cell.className;

    if (cell.html && cell.safe) {
      // Only use innerHTML if explicitly marked as safe
      td.innerHTML = cell.html;
    } else {
      td.textContent = cell.text || '';
    }

    tr.appendChild(td);
  });
  return tr;
}

/**
 * Sanitize HTML by removing script tags and dangerous attributes
 * Note: This is a basic sanitizer. For production, use DOMPurify library
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  if (!html) return '';

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.textContent = html; // This escapes all HTML
  return temp.innerHTML;
}

/**
 * Create a button element safely
 * @param {string} text - Button text
 * @param {string} className - CSS class
 * @param {Function} onclick - Click handler function
 * @returns {HTMLButtonElement} Button element
 */
function createButton(text, className, onclick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  if (className) btn.className = className;
  if (onclick) btn.addEventListener('click', onclick);
  return btn;
}

/**
 * Create a safe link element
 * @param {string} text - Link text
 * @param {string} href - Link URL
 * @param {string} className - CSS class
 * @returns {HTMLAnchorElement} Anchor element
 */
function createLink(text, href, className) {
  const a = document.createElement('a');
  a.textContent = text;
  a.href = href || '#';
  if (className) a.className = className;
  return a;
}

/**
 * Example: Render patient list safely
 * @param {Array} patients - Array of patient objects
 * @param {HTMLElement} container - Container element
 */
function renderPatientList(patients, container) {
  // Clear container
  container.innerHTML = '';

  patients.forEach(patient => {
    const row = createTableRow([
      { text: patient.name },
      { text: patient.email },
      { text: patient.blood_type || 'N/A', className: 'badge' }
    ]);

    // Add action button
    const actionCell = document.createElement('td');
    const viewBtn = createButton('View', 'btn-small', () => {
      viewPatientDetails(patient.id, patient.name);
    });
    actionCell.appendChild(viewBtn);
    row.appendChild(actionCell);

    container.appendChild(row);
  });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTextNode,
    createElement,
    createTableRow,
    sanitizeHTML,
    createButton,
    createLink,
    renderPatientList
  };
}
