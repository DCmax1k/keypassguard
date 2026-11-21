const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const openVault = document.getElementById('open-vault');
const brandLogoButton = document.getElementById('brand-logo-button');
const matchPanel = document.getElementById('match-panel');
const viewAllButton = document.getElementById('view-all-sites');
const vaultPanel = document.getElementById('vault-panel');
const searchInput = document.getElementById('site-search');
const siteList = document.getElementById('site-list');

let savedSites = [];
let currentMatch = null;
let isExpanded = false;

function setStatus(message) {
    if (!statusText) return;
    statusText.classList.remove('hidden');
    statusText.textContent = String(message || '');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function compareSiteNames(left, right) {
    return String(left.name || 'Saved login').localeCompare(
        String(right.name || 'Saved login'),
        undefined,
        { numeric: true, sensitivity: 'base' },
    );
}

function parseSiteUrl(value) {
    if (!value) return null;
    try {
        return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    } catch (error) {
        return null;
    }
}

function matchScore(site, pageUrl) {
    const savedUrl = parseSiteUrl(site.url);
    const currentUrl = parseSiteUrl(pageUrl);
    if (!savedUrl || !currentUrl) return -1;

    const savedHost = savedUrl.hostname.toLowerCase().replace(/^www\./, '');
    const currentHost = currentUrl.hostname.toLowerCase().replace(/^www\./, '');
    const exactHost = savedHost === currentHost;
    if (!exactHost && !currentHost.endsWith(`.${savedHost}`)) return -1;

    return exactHost ? 100 : 50;
}

function getBestMatch(pageUrl) {
    return savedSites
        .map((site, index) => ({ site, index, score: matchScore(site, pageUrl) }))
        .filter((candidate) => candidate.score >= 0)
        .sort((left, right) => right.score - left.score || compareSiteNames(left.site, right.site))[0] || null;
}

function createSiteCard(site, index, isMatch) {
    return `
        <article class="site-card${isMatch ? ' matched-site-card' : ''}">
            <div class="site-name">${escapeHtml(site.name || 'Saved login')}</div>
            <div class="site-meta">${escapeHtml(site.url || 'No site URL saved yet')}</div>
            <div class="site-meta">${escapeHtml(site.username || 'No username saved')}</div>
            <div class="site-actions">
                <button type="button" data-index="${index}" data-field="username" ${site.username ? '' : 'disabled'}>Fill username</button>
                <button type="button" data-index="${index}" data-field="password">Fill password</button>
            </div>
        </article>
    `;
}

async function copyToClipboard(value) {
    if (!value) return false;
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        return copied;
    }
}

function wireFillButtons(root) {
    root.querySelectorAll('button[data-field]').forEach((button) => {
        button.addEventListener('click', () => {
            const site = savedSites[Number(button.dataset.index)];
            if (!site) return;

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = button.dataset.field === 'password' ? 'Loading...' : 'Filling...';
            chrome.runtime.sendMessage({
                type: 'fillSite',
                site,
                field: button.dataset.field,
            }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatus('Could not reach the active page. Reload that tab and try again.');
                } else if (!response || !response.ok) {
                    setStatus(response && response.error
                        ? response.error
                        : 'Unable to fill the selected field.');
                } else {
                    if (response.copiedValue) {
                        setStatus(`Copied ${button.dataset.field} to clipboard.`);
                        copyToClipboard(response.copiedValue).then((copied) => {
                            setStatus(copied
                                ? (response.warning || `Copied ${button.dataset.field} to clipboard.`)
                                : `Could not copy ${button.dataset.field}. The page may not have accepted the fill.`);
                        });
                    } else {
                        setStatus(response.warning || `Filled ${button.dataset.field} on the active page.`);
                    }
                }

                button.disabled = false;
                button.textContent = originalText;
            });
        });
    });
}

function renderSites() {
    const sortedSites = [...savedSites].sort(compareSiteNames);
    const query = searchInput.value.trim().toLowerCase();
    const filteredSites = sortedSites
        .filter((site) => [site.name, site.url, site.username].join(' ').toLowerCase().includes(query));

    if (!filteredSites.length) {
        siteList.innerHTML = `<div class="empty-state">${savedSites.length
            ? 'No saved sites match your search.'
            : 'No saved sites were found. Visit a login page and use the save prompt to add one.'}</div>`;
        return;
    }

    siteList.innerHTML = filteredSites
        .map((site) => createSiteCard(site, savedSites.indexOf(site), false))
        .join('');
    wireFillButtons(siteList);
}

function renderCurrentMatch(pageUrl) {
    currentMatch = getBestMatch(pageUrl);
    matchPanel.classList.remove('hidden');

    if (currentMatch) {
        matchPanel.innerHTML = `
            <div class="match-heading">
                <span class="match-badge">Best match</span>
                <span class="match-caption">For this page</span>
            </div>
            ${createSiteCard(currentMatch.site, currentMatch.index, true)}
        `;
        wireFillButtons(matchPanel);
    } else {
        let createUrl = '';
        try {
            const page = new URL(pageUrl);
            if (/^https?:$/i.test(page.protocol)) {
                const origin = page.origin;
                const name = page.hostname.replace(/^www\./i, '');
                createUrl = `${openVault.href.replace(/\/$/, '')}/dashboard?add=1&url=${encodeURIComponent(origin)}&name=${encodeURIComponent(name)}`;
            }
        } catch (error) {
            createUrl = '';
        }

        matchPanel.innerHTML = `
            <div class="no-match">
                <span class="match-caption">No saved login matches this page yet.</span>
                <span class="match-hint">Open all sites to choose another login.</span>
                ${createUrl
                    ? `<button type="button" class="button create-entry-button" data-create-url="${escapeHtml(createUrl)}">Create new entry for this site</button>`
                    : ''}
            </div>
        `;
        matchPanel.querySelectorAll('[data-create-url]').forEach((button) => {
            button.addEventListener('click', () => {
                chrome.tabs.create({ url: button.dataset.createUrl });
            });
        });
    }

    viewAllButton.classList.remove('hidden');
    viewAllButton.textContent = isExpanded ? 'Hide all sites' : 'View all sites';
    viewAllButton.setAttribute('aria-expanded', String(isExpanded));
}

function loadSites(pageUrl) {
    chrome.runtime.sendMessage({ type: 'searchSites' }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
            statusText.textContent = response && response.error ? response.error : 'Unable to load saved sites.';
            matchPanel.classList.add('hidden');
            viewAllButton.classList.add('hidden');
            return;
        }

        savedSites = Array.isArray(response.entries) ? response.entries : [];
        renderCurrentMatch(pageUrl);
        renderSites();
    });
}

function queryActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeUrl = tabs[0] && tabs[0].url;
            if (activeUrl && /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(activeUrl)) {
                openVault.href = new URL(activeUrl).origin;
            } else if (!openVault.href || openVault.href === 'https://www.keypassguard.com/') {
                openVault.href = KEYPASS_GUARD_EXTENSION_CONFIG.apiBaseUrl;
            }
            resolve(activeUrl || '');
        });
    });
}

function loadSession(pageUrl) {
    chrome.runtime.sendMessage({ type: 'getSessionState' }, (state) => {
        if (chrome.runtime.lastError) {
            statusText.textContent = 'Unable to check your Keypass Guard session.';
            return;
        }

        if (state && state.isAuthenticated) {
            if (state.apiBaseUrl) openVault.href = state.apiBaseUrl;
            const isOnline = state.isOnline !== false;
            statusPill.textContent = isOnline ? 'Online' : 'Offline';
            statusPill.classList.toggle('online', isOnline);
            statusText.textContent = isOnline
                ? 'Choose the matching login for this page, or view all saved sites.'
                : state.error || 'The Keypass Guard server is unavailable.';
            openVault.classList.add('hidden');
            vaultPanel.classList.toggle('hidden', !isExpanded);
            loadSites(pageUrl);
            return;
        }

        statusPill.textContent = 'Offline';
        statusPill.classList.remove('online');
        statusText.textContent = state && state.error
            ? `Couldn't verify the website session: ${state.error}`
            : 'Sign in to Keypass Guard on the website. This extension will detect your session automatically.';
    });
}

viewAllButton.addEventListener('click', () => {
    isExpanded = !isExpanded;
    vaultPanel.classList.toggle('hidden', !isExpanded);
    viewAllButton.textContent = isExpanded ? 'Hide all sites' : 'View all sites';
    viewAllButton.setAttribute('aria-expanded', String(isExpanded));
    if (isExpanded) searchInput.focus();
});

searchInput.addEventListener('input', renderSites);

openVault.addEventListener('click', (event) => {
    event.preventDefault();
    chrome.tabs.create({ url: openVault.href });
});

brandLogoButton.addEventListener('click', () => {
    chrome.tabs.create({ url: openVault.href });
});

queryActiveTab().then((pageUrl) => {
    loadSession(pageUrl);
});
