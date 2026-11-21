globalThis.__keypassGuardContentInitialized = true;

const KEYPASSGUARD_SAVE_BANNER_ID = 'keypassguard-save-banner';
let lastFocusedInput = null;

function isElementConnected(element) {
    try {
        return Boolean(element && element.isConnected);
    } catch (error) {
        return false;
    }
}

function isExtensionContextValid() {
    try {
        return Boolean(globalThis.chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        return false;
    }
}

function sendExtensionMessage(message, callback) {
    if (!isExtensionContextValid()) {
        if (callback) callback({ error: 'Extension context was invalidated.' });
        return false;
    }

    try {
        chrome.runtime.sendMessage(message, (response) => {
            let lastError = null;
            try {
                lastError = chrome.runtime.lastError;
            } catch (error) {
                lastError = error;
            }
            if (callback) callback(response, lastError);
        });
        return true;
    } catch (error) {
        if (callback) callback({ error: 'Extension context was invalidated.' }, error);
        return false;
    }
}

function collectInputElements(root = document) {
    const inputs = [];
    for (const element of root.querySelectorAll('*')) {
        if (element instanceof HTMLInputElement) inputs.push(element);
        if (element.shadowRoot) {
            inputs.push(...collectInputElements(element.shadowRoot));
        }
    }
    return inputs;
}

function isKeypassGuardSite() {
    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'localhost'
        || hostname.endsWith('.localhost')
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === 'keypassguard.com'
        || hostname.endsWith('.keypassguard.com');
}

function findUsernameInput(root = document) {
    const selectors = [
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        'input[type="email"]',
        'input[name*="email" i]:not([type="password"])',
        'input[name*="username" i]:not([type="password"])',
        'input[name*="user" i]:not([type="password"])',
        'input[id*="email" i]:not([type="password"])',
        'input[id*="username" i]:not([type="password"])',
        'input[id*="user" i]:not([type="password"])',
        'input[type="text"]:not([type="password"])',
        'input:not([type]):not([type="password"])',
    ];

    for (const selector of selectors) {
        const fields = collectInputElements(root).filter((field) => field.matches(selector));
        const visibleField = fields.find((field) => (
            isElementConnected(field)
            && !field.disabled
            && field.type !== 'hidden'
            && field.getClientRects().length > 0
        ));
        if (visibleField) return visibleField;
    }

    return collectInputElements(root)
        .find((field) => (
            isElementConnected(field)
            && !field.disabled
            && field.type !== 'hidden'
            && field.type !== 'password'
            && field.type !== 'checkbox'
            && field.type !== 'radio'
            && field.type !== 'submit'
            && field.type !== 'button'
            && field.getClientRects().length > 0
        )) || null;
}

function findPasswordInput(root = document) {
    return collectInputElements(root)
        .filter((field) => field.type === 'password')
        .find((field) => (
            isElementConnected(field)
            && !field.disabled
            && field.getClientRects().length > 0
        )) || collectInputElements(root).find((field) => (
            field.type === 'password'
            && !field.disabled
        )) || null;
}

function setInputValue(field, value) {
    if (!isElementConnected(field) || !value) return false;
    field.focus({ preventScroll: true });
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!descriptor || !descriptor.set) return false;
    try {
        descriptor.set.call(field, value);
    } catch (error) {
        return false;
    }

    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
    field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
    return true;
}

function fillFormWithCredentials(form, credential, preferredPasswordField) {
    if (!credential) return false;

    const root = form || document;
    const usernameField = findUsernameInput(root) || (root !== document ? findUsernameInput() : null);
    const passwordField = isElementConnected(preferredPasswordField)
        ? preferredPasswordField
        : findPasswordInput(root);
    let filled = false;

    if (credential.username && usernameField) {
        filled = setInputValue(usernameField, credential.username) || filled;
    }
    if (credential.password && passwordField) {
        filled = setInputValue(passwordField, credential.password) || filled;
    }

    return filled;
}

function showFillFeedback(message, isError) {
    const previous = document.getElementById('keypassguard-fill-feedback');
    if (previous) removeExtensionElement(previous);

    const notice = document.createElement('div');
    notice.id = 'keypassguard-fill-feedback';
    notice.textContent = message;
    notice.style.cssText = [
        'position:fixed',
        'right:16px',
        'bottom:16px',
        'z-index:2147483647',
        'max-width:320px',
        'padding:9px 12px',
        'border:1px solid',
        `border-color:${isError ? '#9c4b4b' : '#286243'}`,
        'border-radius:9px',
        `background:${isError ? '#3d2020' : '#173a2b'}`,
        `color:${isError ? '#f5b5b5' : '#88e8b4'}`,
        'font:12px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'box-shadow:0 4px 14px rgba(5,25,35,0.3)',
    ].join(';');
    document.body.appendChild(notice);
    setTimeout(() => removeExtensionElement(notice), 2200);
}

function fillFocusedField(credential) {
    const field = isElementConnected(lastFocusedInput) ? lastFocusedInput : null;
    if (credential.field === 'username') {
        const target = field
            && field.type !== 'password'
            && field.type !== 'hidden'
            && ['text', 'email', 'tel', 'url', 'search', 'number'].includes(field.type)
            ? field
            : findUsernameInput();
        return setInputValue(target, credential.username);
    }
    if (credential.field === 'password') {
        const target = field && field.type === 'password' ? field : findPasswordInput();
        return setInputValue(target, credential.password);
    }
    return fillFormWithCredentials(field && field.closest('form'), credential);
}

function removeExtensionElement(element) {
    if (!element) return;
    try {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    } catch (error) {
    }
}

function createSaveBanner(payload) {
    payload = payload || {};
    const existing = document.getElementById(KEYPASSGUARD_SAVE_BANNER_ID);
    if (existing) removeExtensionElement(existing);

    const banner = document.createElement('div');
    banner.id = KEYPASSGUARD_SAVE_BANNER_ID;
    banner.style.cssText = [
        'position:fixed',
        'right:16px',
        'bottom:16px',
        'max-width:320px',
        'padding:12px 14px',
        'background:#051923',
        'color:#f8fafc',
        'border-radius:12px',
        'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'font-size:14px',
        'box-shadow:0 18px 32px rgba(5,25,35,0.35)',
        'z-index:2147483647',
        'display:flex',
        'flex-direction:column',
        'gap:8px',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Save this login to Keypass Guard?';
    title.style.fontWeight = '700';
    const username = document.createElement('div');
    username.textContent = payload.username || 'New login';
    username.style.opacity = '0.8';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'No';
    cancelButton.style.cssText = 'border:none;border-radius:8px;padding:7px 10px;background:rgba(148,163,184,0.2);color:#fff;cursor:pointer;';
    cancelButton.addEventListener('click', () => removeExtensionElement(banner));

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';
    saveButton.style.cssText = 'border:none;border-radius:8px;padding:7px 10px;background:#286243;color:#88E8B4;font-weight:700;cursor:pointer;';
    saveButton.addEventListener('click', () => {
        sendExtensionMessage({
            type: 'saveCredentials',
            site: {
                id: '',
                name: document.title || window.location.hostname,
                username: payload.username,
                password: payload.password,
                url: window.location.origin,
                note: 'Saved from browser extension',
            },
        }, (response, lastError) => {
            removeExtensionElement(banner);
            if (lastError || !response || !response.ok) return;
            const flash = document.createElement('div');
            flash.textContent = 'Saved';
            flash.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 12px;border-radius:8px;background:#286243;color:#88E8B4;font-size:12px;font-weight:700;';
            document.body.appendChild(flash);
            setTimeout(() => removeExtensionElement(flash), 1500);
        });
    });

    actions.append(cancelButton, saveButton);
    banner.append(title, username, actions);
    document.body.appendChild(banner);
}

function maybePromptToSave(form) {
    if (isKeypassGuardSite()) return;
    const passwordField = findPasswordInput(form);
    if (!passwordField || !passwordField.value) return;

    const usernameField = findUsernameInput(form);
    const username = String(usernameField && usernameField.value || '').trim();
    const password = String(passwordField.value || '').trim();
    if (!username || !password) return;

    sendExtensionMessage({ type: 'getCredentials', url: window.location.href }, (response, lastError) => {
        if (lastError || !response || response.error) return;
        const alreadySaved = (response.entries || []).some((entry) => (
            entry.username && entry.username.toLowerCase() === username.toLowerCase()
        ));
        if (!alreadySaved) createSaveBanner({ username, password });
    });
}

function scanLoginForms() {
    if (isKeypassGuardSite()) return;

    document.querySelectorAll('form').forEach((form) => {
        if (!findPasswordInput(form) || form.dataset.keypassguardSubmitListener === 'true') return;
        form.dataset.keypassguardSubmitListener = 'true';
        form.addEventListener('submit', () => maybePromptToSave(form), { passive: true });
    });
}

document.addEventListener('focusin', (event) => {
    const field = event.composedPath().find((element) => element instanceof HTMLInputElement);
    if (field) {
        lastFocusedInput = field;
    }
});

if (isExtensionContextValid()) {
    try {
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message && message.type === 'fillSelectedCredential') {
                const filled = fillFocusedField(message.credential || {});
                sendResponse(filled
                    ? { ok: true }
                    : { ok: false, error: 'No matching login field was available.' });
                return false;
            }
            return false;
        });
    } catch (error) {
        // The extension was reloaded while this page still had an old content-script context.
    }
}

document.addEventListener('DOMContentLoaded', scanLoginForms);
let scanScheduled = false;
const observer = new MutationObserver(() => {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
        scanScheduled = false;
        try {
            scanLoginForms();
        } catch (error) {
            if (!isExtensionContextValid()) observer.disconnect();
        }
    });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
scanLoginForms();
