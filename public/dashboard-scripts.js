// Shared dashboard scripts

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (response.ok && data.user) {
            // Safely update userName element if it exists
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = data.user.name;
            }
            return data.user;
        } else {
            window.location.href = '/login.html';
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = '/login.html';
}

// Run auth check on page load
window.addEventListener('load', checkAuth);
