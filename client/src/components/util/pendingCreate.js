const PENDING_CREATE_SEARCH = 'keypassguard_pending_create_search';

export function savePendingCreateSearch(search) {
    if (typeof window === 'undefined') return;
    const value = String(search || '');
    if (value.includes('add=1')) {
        window.sessionStorage.setItem(PENDING_CREATE_SEARCH, value);
    }
}

export function getPendingCreateSearch() {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(PENDING_CREATE_SEARCH) || '';
}

export function clearPendingCreateSearch() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(PENDING_CREATE_SEARCH);
}
