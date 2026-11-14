const STORAGE_KEY = 'keypassguard_extension_state';
const PRODUCTION_API = 'https://www.keypassguard.com';
const LOCAL_API = 'http://localhost:3001';
const SESSION_COOKIE_URLS = [
    { url: 'http://localhost:3001', apiBaseUrl: LOCAL_API },
    { url: 'http://localhost:3000', apiBaseUrl: LOCAL_API },
    { url: 'https://www.keypassguard.com', apiBaseUrl: PRODUCTION_API },
    { url: 'https://keypassguard.com', apiBaseUrl: PRODUCTION_API },
];

async function getStoredState() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            resolve(result[STORAGE_KEY] || {});
        });
    });
}

async function saveStoredState(state) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY]: state }, () => resolve());
    });
}

function buildHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

async function fetchJson(path, options = {}, apiBaseUrl = PRODUCTION_API) {
    const response = await fetch(`${apiBaseUrl}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (response.ok || data.status === 'success') {
        return { response, data };
    }

    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    throw error;
}

async function refreshAccessToken() {
    const state = await getStoredState();
    const refreshToken = state.refreshToken;

    if (!refreshToken) {
        throw new Error('Not authenticated');
    }

    let data;
    try {
        const response = await fetchJson('/api/auth/extension-refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        }, state.apiBaseUrl);
        data = response.data;
    } catch (error) {
        if (error.status !== 404) throw error;
        await validateWebsiteSession(refreshToken, state.apiBaseUrl);
        data = {
            status: 'success',
            accessToken: refreshToken,
            expiresAt: getTokenExpiry(refreshToken) || Date.now() + 5 * 60 * 1000,
        };
    }

    if (!data || data.status !== 'success') {
        throw new Error(data.message || 'Failed to refresh authentication');
    }

    const nextState = {
        ...state,
        accessToken: data.accessToken,
        expiresAt: Number(data.expiresAt || Date.now() + 5 * 60 * 1000),
        isAuthenticated: true,
    };

    await saveStoredState(nextState);
    return data.accessToken;
}

function getTokenExpiry(token) {
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(payload));
        return Number(decoded.exp || 0) * 1000;
    } catch (error) {
        return 0;
    }
}

async function validateWebsiteSession(token, apiBaseUrl) {
    const { data } = await fetchJson('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonWebToken: token }),
    }, apiBaseUrl);

    if (!data || data.status !== 'success') {
        throw new Error(data.message || 'The Keypass Guard website session is not valid.');
    }
}

async function ensureAccessToken() {
    let state = await adoptWebsiteSession() || await getStoredState();

    if (!state.refreshToken) {
        return null;
    }

    if (!state.accessToken || Number(state.expiresAt || 0) <= Date.now() + 30_000) {
        return refreshAccessToken();
    }

    return state.accessToken;
}

async function getSessionState() {
    try {
        const accessToken = await ensureAccessToken();
        if (!accessToken) return { isAuthenticated: false, isOnline: false };

        const state = await getStoredState();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        try {
            await fetchJson('/checkping', {
                method: 'POST',
                signal: controller.signal,
            }, state.apiBaseUrl);
            return { isAuthenticated: true, isOnline: true };
        } catch (error) {
            return {
                isAuthenticated: true,
                isOnline: false,
                error: error.name === 'AbortError'
                    ? 'The Keypass Guard server did not respond.'
                    : `The Keypass Guard server is unavailable: ${error.message}`,
            };
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        if (error.message && /expired|invalid|session/i.test(error.message)) {
            await saveStoredState({});
        }
        return { isAuthenticated: false, error: error.message || 'Unable to verify your website session.' };
    }
}

async function getSiteSessionCookie() {
    for (const source of SESSION_COOKIE_URLS) {
        const cookie = await new Promise((resolve) => {
            chrome.cookies.get({ url: source.url, name: 'auth-token' }, resolve);
        });
        if (cookie && cookie.value) return { ...source, cookie };
    }

    return null;
}

async function adoptWebsiteSession() {
    const session = await getSiteSessionCookie();
    if (!session || !session.cookie.value) return null;

    const state = await getStoredState();
    if (state.refreshToken !== session.cookie.value || state.apiBaseUrl !== session.apiBaseUrl) {
        const updatedState = {
            refreshToken: session.cookie.value,
            apiBaseUrl: session.apiBaseUrl,
            accessToken: '',
            expiresAt: 0,
            isAuthenticated: true,
        };
        await saveStoredState(updatedState);
        return updatedState;
    }

    return state;
}

async function refreshSessionFromCookie() {
    try {
        const session = await getSiteSessionCookie();
        if (session) {
            await adoptWebsiteSession();
        } else {
            await saveStoredState({});
        }
    } catch (error) {
        console.error('Unable to read Keypass Guard session cookie:', error);
    }
}

chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cookie.name !== 'auth-token') return;
    const cookieDomain = changeInfo.cookie.domain.replace(/^\./, '');
    const isLocalhost = cookieDomain === 'localhost';
    const isKeypassGuard = cookieDomain === 'keypassguard.com'
        || cookieDomain === 'www.keypassguard.com'
        || cookieDomain.endsWith('.keypassguard.com');
    if (!isLocalhost && !isKeypassGuard) return;
    refreshSessionFromCookie();
});

chrome.runtime.onStartup.addListener(() => {
    refreshSessionFromCookie();
});

chrome.runtime.onInstalled.addListener(() => {
    refreshSessionFromCookie();
});

function parseSiteUrl(input = '') {
    try {
        const value = String(input).trim();
        if (!value) return null;
        const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
        return {
            host: url.hostname.toLowerCase().replace(/^www\./i, ''),
            path: url.pathname.replace(/\/+$/, '') || '/',
        };
    } catch (error) {
        return null;
    }
}

function siteMatchScore(site, requestedUrl) {
    const saved = parseSiteUrl(site.url || '');
    const requested = parseSiteUrl(requestedUrl);
    if (!saved || !requested) return -1;

    const exactHost = saved.host === requested.host;
    if (!exactHost && !requested.host.endsWith(`.${saved.host}`)) return -1;
    if (saved.path !== '/' && requested.path !== saved.path && !requested.path.startsWith(`${saved.path}/`)) {
        return -1;
    }

    return (exactHost ? 100 : 50) + (saved.path === requested.path ? 20 : (saved.path === '/' ? 0 : 10));
}

function siteMatchesUrl(site, requestedUrl) {
    return siteMatchScore(site, requestedUrl) >= 0;
}

async function getLegacyVaultEntries(url, token, apiBaseUrl) {
    const { data: authData } = await fetchJson('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonWebToken: token }),
    }, apiBaseUrl);

    if (!authData || authData.status !== 'success') {
        throw new Error(authData.message || 'Unable to load saved logins.');
    }

    const allSites = authData && authData.user && Array.isArray(authData.user.sites)
        ? authData.user.sites
        : [];

    const sites = url
        ? allSites
            .filter((site) => siteMatchesUrl(site, url))
            .sort((left, right) => siteMatchScore(right, url) - siteMatchScore(left, url))
        : allSites;
    return {
        entries: sites.map((site) => ({
            id: site.id,
            name: site.name || site.url || 'Saved login',
            username: site.username || '',
            url: site.url || '',
        })),
    };
}

async function getVaultEntries(url = '') {
    const token = await ensureAccessToken();
    if (!token) {
        return { entries: [] };
    }
    const state = await getStoredState();

    let result;
    try {
        result = await fetchJson('/api/extension/vault', {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ url }),
        }, state.apiBaseUrl);
    } catch (error) {
        if (error.status !== 404) throw error;
        return getLegacyVaultEntries(url, token, state.apiBaseUrl);
    }

    if (!result.data || result.data.status !== 'success') {
        throw new Error(result.data.message || 'Unable to load saved passwords');
    }

    const entries = Array.isArray(result.data.entries) ? result.data.entries : [];
    if (url) {
        entries.sort((left, right) => siteMatchScore(right, url) - siteMatchScore(left, url));
    }
    return { entries };
}

async function decryptSitePassword(siteId, apiBaseUrl) {
    const token = await ensureAccessToken();
    if (!token) throw new Error('Not authenticated');

    const state = await getStoredState();
    const { data } = await fetchJson('/dashboard/requestdecrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonWebToken: token, site: { id: siteId } }),
    }, apiBaseUrl || state.apiBaseUrl);

    if (!data || data.status !== 'success' || typeof data.data !== 'string') {
        throw new Error(data.message || 'Unable to decrypt this saved password.');
    }

    return atob(data.data);
}

async function associateSiteUrl(siteId, url, apiBaseUrl) {
    const state = await getStoredState();
    const token = await ensureAccessToken();
    if (!token) throw new Error('Not authenticated');

    const { data } = await fetchJson('/api/extension/vault/associate-url', {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ id: siteId, url }),
    }, apiBaseUrl || state.apiBaseUrl);

    if (!data || data.status !== 'success') {
        throw new Error(data.message || 'Unable to save this site URL.');
    }
}

async function fillSiteInActiveTab(site, field) {
    if (!site || !site.id || !['username', 'password'].includes(field)) {
        throw new Error('Choose a saved login and a field to fill.');
    }

    const state = await getStoredState();
    const token = await ensureAccessToken();
    if (!token) throw new Error('Not authenticated');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active tab is available.');
    await ensureContentScript(tab.id);

    const credential = {
        field,
        username: field === 'username' ? (site.username || '') : '',
        password: field === 'password' ? await decryptSitePassword(site.id, state.apiBaseUrl) : '',
    };

    const result = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'fillSelectedCredential',
            credential,
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error('Reload the website tab before filling fields.'));
                return;
            }
            if (!response || !response.ok) {
                reject(new Error(response && response.error ? response.error : 'No matching input field is available.'));
                return;
            }
            resolve(response);
        });
    });

    let warning = '';
    if (!site.url && tab.url && /^https?:\/\//i.test(tab.url)) {
        try {
            await associateSiteUrl(site.id, new URL(tab.url).origin, state.apiBaseUrl);
        } catch (error) {
            warning = error.message || 'The site URL could not be saved.';
        }
    }

    return { ...result, warning };
}

async function ensureContentScript(tabId) {
    const [state] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => Boolean(globalThis.__keypassGuardContentInitialized),
    });

    if (!state || !state.result) {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
        });
    }
}

async function saveVaultEntry(site) {
    const token = await ensureAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }
    const state = await getStoredState();

    const { data } = await fetchJson('/api/extension/vault/save', {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ site }),
    }, state.apiBaseUrl);

    if (!data || data.status !== 'success') {
        throw new Error(data.message || 'Unable to save login');
    }

    return data.site;
}

function isPopupSender(sender) {
    return sender.id === chrome.runtime.id
        && !sender.tab
        && typeof sender.url === 'string'
        && sender.url.endsWith('/index.html');
}

function isCurrentPageUrl(sender, url) {
    try {
        return Boolean(sender.tab && sender.url && new URL(sender.url).origin === new URL(url).origin);
    } catch (error) {
        return false;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message && message.type;

    if (type === 'getSessionState') {
        getSessionState().then((state) => sendResponse(state)).catch((error) => sendResponse({ error: error.message || 'Unknown error' }));
        return true;
    }

    if (type === 'getCredentials') {
        if (!isCurrentPageUrl(sender, message.url)) {
            sendResponse({ error: 'Credentials can only be checked for the current page.', entries: [] });
            return false;
        }
        getVaultEntries(message.url).then((payload) => sendResponse(payload)).catch((error) => sendResponse({ error: error.message || 'Unable to load credentials', entries: [] }));
        return true;
    }

    if (type === 'getPasswordForSite') {
        if (!sender.tab || !sender.url) {
            sendResponse({ ok: false, error: 'Passwords can only be requested by the current page.' });
            return false;
        }
        const pageUrl = sender.url;
        getVaultEntries(pageUrl).then(async ({ entries }) => {
            const site = entries.find((entry) => entry.id === message.siteId);
            if (!site) throw new Error('This saved login does not match the current page.');
            const password = await decryptSitePassword(site.id);
            sendResponse({ ok: true, credential: { username: site.username, password } });
        }).catch((error) => sendResponse({ ok: false, error: error.message || 'Unable to load this password.' }));
        return true;
    }

    if (type === 'searchSites') {
        if (!isPopupSender(sender)) {
            sendResponse({ error: 'Site search is only available in the extension popup.', entries: [] });
            return false;
        }
        getVaultEntries().then((payload) => sendResponse(payload)).catch((error) => sendResponse({ error: error.message || 'Unable to search saved sites.', entries: [] }));
        return true;
    }

    if (type === 'fillSite') {
        if (!isPopupSender(sender)) {
            sendResponse({ ok: false, error: 'This action is only available in the extension popup.' });
            return false;
        }
        fillSiteInActiveTab(message.site, message.field)
            .then((result) => sendResponse({ ok: true, ...result }))
            .catch((error) => sendResponse({ ok: false, error: error.message || 'Unable to fill this field.' }));
        return true;
    }

    if (type === 'prepareActiveTab') {
        if (!isPopupSender(sender)) {
            sendResponse({ ok: false, error: 'This action is only available in the extension popup.' });
            return false;
        }
        chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
            if (!tab || !tab.id || !/^https?:\/\//i.test(tab.url || '')) {
                sendResponse({ ok: true });
                return;
            }
            await ensureContentScript(tab.id);
            sendResponse({ ok: true });
        }).catch((error) => {
            sendResponse({ ok: false, error: error.message || 'Unable to prepare the active page for autofill.' });
        });
        return true;
    }

    if (type === 'saveCredentials') {
        if (!sender.tab || !isCurrentPageUrl(sender, message.site && message.site.url)) {
            sendResponse({ ok: false, error: 'A login can only be saved for the current page.' });
            return false;
        }
        saveVaultEntry(message.site).then((site) => sendResponse({ ok: true, site })).catch((error) => sendResponse({ ok: false, error: error.message || 'Unable to save' }));
        return true;
    }

    sendResponse({ ok: false, error: 'Unsupported action' });
    return false;
});
