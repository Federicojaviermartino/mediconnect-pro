/**
 * CSRF Protection Utility
 *
 * Fetches CSRF token from server and provides helpers for protected requests
 */

// Store the CSRF token
let csrfToken = null;

/**
 * Fetch CSRF token from the server
 * @returns {Promise<string>} The CSRF token
 */
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();
        csrfToken = data.csrfToken;
        console.log('CSRF token fetched successfully');
        return csrfToken;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
    }
}

/**
 * Get the current CSRF token, fetching it if necessary
 * @returns {Promise<string>} The CSRF token
 */
async function getCsrfToken() {
    if (!csrfToken) {
        return await fetchCsrfToken();
    }
    return csrfToken;
}

/**
 * Make a fetch request with CSRF protection
 * Automatically adds CSRF token header for non-GET requests
 *
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
async function csrfFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    // Only add CSRF token for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Ensure we have a token
        const token = await getCsrfToken();

        // Add CSRF header
        options.headers = {
            ...options.headers,
            'X-CSRF-Token': token
        };
    }

    // Always include credentials
    options.credentials = options.credentials || 'include';

    const response = await fetch(url, options);

    // If we get a 403 with CSRF error, try refreshing the token and retry once
    if (response.status === 403) {
        const data = await response.clone().json();
        if (data.error && data.error.includes('CSRF')) {
            console.warn('CSRF token expired, refreshing...');
            csrfToken = null;
            const newToken = await fetchCsrfToken();
            options.headers['X-CSRF-Token'] = newToken;
            return fetch(url, options);
        }
    }

    return response;
}

/**
 * Helper for POST requests with CSRF protection
 * @param {string} url - The URL to POST to
 * @param {object} data - The data to send
 * @returns {Promise<Response>} The fetch response
 */
async function csrfPost(url, data) {
    return csrfFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

/**
 * Helper for PUT requests with CSRF protection
 * @param {string} url - The URL to PUT to
 * @param {object} data - The data to send
 * @returns {Promise<Response>} The fetch response
 */
async function csrfPut(url, data) {
    return csrfFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

/**
 * Helper for DELETE requests with CSRF protection
 * @param {string} url - The URL to DELETE
 * @returns {Promise<Response>} The fetch response
 */
async function csrfDelete(url) {
    return csrfFetch(url, {
        method: 'DELETE'
    });
}

/**
 * Initialize CSRF protection by fetching the token
 * Call this on page load
 */
async function initCsrfProtection() {
    try {
        await fetchCsrfToken();
        console.log('CSRF protection initialized');
    } catch (error) {
        console.error('Failed to initialize CSRF protection:', error);
    }
}

// Export functions to global scope
window.csrfFetch = csrfFetch;
window.csrfPost = csrfPost;
window.csrfPut = csrfPut;
window.csrfDelete = csrfDelete;
window.getCsrfToken = getCsrfToken;
window.initCsrfProtection = initCsrfProtection;
