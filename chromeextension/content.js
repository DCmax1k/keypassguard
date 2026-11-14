globalThis.__keypassGuardContentInitialized = true;

const KEYPASSGUARD_SAVE_BANNER_ID = 'keypassguard-save-banner';
const AUTOFILL_BUTTON_CLASS = 'keypassguard-autofill-button';
const AUTOFILL_OVERLAY_ID = 'keypassguard-autofill-overlay';
let lastFocusedInput = null;

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
    ];

    for (const selector of selectors) {
        const field = root.querySelector(selector);
        if (field) return field;
    }

    return null;
}

function findPasswordInput(root = document) {
    return root.querySelector('input[type="password"]');
}

function setInputValue(field, value) {
    if (!field || !field.isConnected || !value) return false;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!descriptor || !descriptor.set) return false;
    const setter = descriptor.set;
    setter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function fillFormWithCredentials(form, credential, preferredPasswordField) {
    if (!credential) return false;

    const root = form || document;
    const usernameField = findUsernameInput(root) || (root !== document ? findUsernameInput() : null);
    const passwordField = preferredPasswordField && preferredPasswordField.isConnected
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
    if (previous) previous.remove();

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
    setTimeout(() => notice.remove(), 2200);
}

function fillFocusedField(credential) {
    const field = lastFocusedInput && lastFocusedInput.isConnected ? lastFocusedInput : null;
    if (credential.field === 'username') {
        const target = field && field.type !== 'password' ? field : findUsernameInput();
        return setInputValue(target, credential.username);
    }
    if (credential.field === 'password') {
        const target = field && field.type === 'password' ? field : findPasswordInput();
        return setInputValue(target, credential.password);
    }
    return fillFormWithCredentials(field && field.closest('form'), credential);
}

function getAutofillOverlay() {
    let overlay = document.getElementById(AUTOFILL_OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = AUTOFILL_OVERLAY_ID;
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100vw',
        'height:100vh',
        'z-index:2147483647',
        'pointer-events:none',
    ].join(';');
    document.documentElement.appendChild(overlay);
    return overlay;
}

function overlapsSiteControl(passwordField, buttonRect) {
    const container = passwordField.closest('form') || passwordField.parentElement;
    if (!container) return false;

    return Array.from(container.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]'))
        .some((control) => {
            if (control.classList.contains(AUTOFILL_BUTTON_CLASS)) return false;
            const rect = control.getBoundingClientRect();
            return rect.width > 0
                && rect.height > 0
                && rect.right > buttonRect.left
                && rect.left < buttonRect.right
                && rect.bottom > buttonRect.top
                && rect.top < buttonRect.bottom;
        });
}

function positionAutofillButton(button, passwordField) {
    if (!passwordField.isConnected) {
        button.remove();
        return;
    }

    const rect = passwordField.getBoundingClientRect();
    if (rect.width < 105 || rect.height < 24) {
        button.style.display = 'none';
        return;
    }

    button.style.display = 'inline-flex';
    const buttonRect = {
        left: rect.right - button.offsetWidth - 5,
        right: rect.right - 5,
        top: rect.top + (rect.height - button.offsetHeight) / 2,
        bottom: rect.top + (rect.height + button.offsetHeight) / 2,
    };
    if (buttonRect.left < rect.left || overlapsSiteControl(passwordField, buttonRect)) {
        button.style.display = 'none';
        return;
    }

    button.style.left = `${buttonRect.left}px`;
    button.style.top = `${buttonRect.top}px`;
}

function createAutofillButton(credential, passwordField) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = `Fill ${credential.name || credential.username || 'saved login'}`;
    button.className = AUTOFILL_BUTTON_CLASS;
    button.style.cssText = [
        'position:absolute',
        'z-index:2147483647',
        'display:inline-flex',
        'align-items:center',
        'justify-content:flex-start',
        'gap:4px',
        'width:58px',
        'height:23px',
        'padding:1px 5px 1px 0',
        'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'font-size:10px',
        'font-weight:700',
        'border:1px solid #75B2D6',
        'border-radius:999px',
        'background:#051923',
        'color:#fff',
        'cursor:pointer',
        'line-height:1',
        'pointer-events:auto',
        'box-shadow:0 2px 8px rgba(5,25,35,0.35)',
    ].join(';');
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('assets/ext-icon.png');
    icon.alt = '';
    icon.width = 13;
    icon.height = 13;
    icon.style.cssText = 'display:block;width:13px;height:13px;object-fit:contain;flex:0 0 13px;';
    const label = document.createElement('span');
    label.textContent = 'Fill';
    button.append(icon, label);
    button._keypassguardInput = passwordField;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        chrome.runtime.sendMessage({
            type: 'getPasswordForSite',
            siteId: credential.id,
        }, (response) => {
            button.disabled = false;
            if (chrome.runtime.lastError || !response || !response.ok) {
                const error = response && response.error
                    ? response.error
                    : 'Could not load this saved password.';
                button.title = error;
                showFillFeedback(error, true);
                return;
            }

            const filled = fillFormWithCredentials(
                passwordField.closest('form'),
                response.credential,
                passwordField,
            );
            if (!filled) {
                const error = 'No matching login fields are available on this page.';
                button.title = error;
                showFillFeedback(error, true);
                return;
            }

            button.title = 'Login fields filled';
            showFillFeedback('Keypass Guard filled the login fields.', false);
        });
    });

    positionAutofillButton(button, passwordField);
    return button;
}

function injectAutofillButtons(passwordField) {
    if (isKeypassGuardSite()) return;

    const pageUrl = window.location.href;
    if (passwordField.dataset.keypassguardCheckedUrl !== pageUrl) {
        delete passwordField.dataset.keypassguardChecked;
        delete passwordField.dataset.keypassguardChecking;
        delete passwordField.dataset.keypassguardCheckedUrl;
        document.querySelectorAll(`.${AUTOFILL_BUTTON_CLASS}`).forEach((button) => {
            if (button._keypassguardInput === passwordField) button.remove();
        });
    }

    if (passwordField.dataset.keypassguardChecked === 'true'
        || passwordField.dataset.keypassguardChecking === 'true') return;

    passwordField.dataset.keypassguardChecking = 'true';
    chrome.runtime.sendMessage({
        type: 'getCredentials',
        url: pageUrl,
    }, (response) => {
        delete passwordField.dataset.keypassguardChecking;
        if (chrome.runtime.lastError || !response || response.error || !passwordField.isConnected) return;

        passwordField.dataset.keypassguardChecked = 'true';
        passwordField.dataset.keypassguardCheckedUrl = pageUrl;
        const entries = Array.isArray(response.entries) ? response.entries : [];
        if (!entries.length || !document.body || isKeypassGuardSite()) return;

        const button = createAutofillButton(entries[0], passwordField);
        getAutofillOverlay().appendChild(button);
        positionAutofillButton(button, passwordField);
    });
}

function createSaveBanner(payload) {
    const existing = document.getElementById(KEYPASSGUARD_SAVE_BANNER_ID);
    if (existing) existing.remove();

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
    cancelButton.addEventListener('click', () => banner.remove());

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';
    saveButton.style.cssText = 'border:none;border-radius:8px;padding:7px 10px;background:#286243;color:#88E8B4;font-weight:700;cursor:pointer;';
    saveButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            type: 'saveCredentials',
            site: {
                id: '',
                name: document.title || window.location.hostname,
                username: payload.username,
                password: payload.password,
                url: window.location.origin,
                note: 'Saved from browser extension',
            },
        }, (response) => {
            banner.remove();
            if (chrome.runtime.lastError || !response || !response.ok) return;
            const flash = document.createElement('div');
            flash.textContent = 'Saved';
            flash.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 12px;border-radius:8px;background:#286243;color:#88E8B4;font-size:12px;font-weight:700;';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 1500);
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

    chrome.runtime.sendMessage({ type: 'getCredentials', url: window.location.href }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) return;
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

    document.querySelectorAll('input[type="password"]').forEach(injectAutofillButtons);
    document.querySelectorAll(`.${AUTOFILL_BUTTON_CLASS}`).forEach((button) => {
        positionAutofillButton(button, button._keypassguardInput);
    });
}

document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLInputElement) lastFocusedInput = event.target;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'fillSelectedCredential') {
        const filled = fillFocusedField(message.credential || {});
        sendResponse(filled
            ? { ok: true }
            : { ok: false, error: 'Focus a matching username or password field first.' });
        return false;
    }
    return false;
});

document.addEventListener('DOMContentLoaded', scanLoginForms);
const observer = new MutationObserver(scanLoginForms);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('scroll', () => {
    document.querySelectorAll(`.${AUTOFILL_BUTTON_CLASS}`).forEach((button) => {
        positionAutofillButton(button, button._keypassguardInput);
    });
}, true);
window.addEventListener('resize', () => {
    document.querySelectorAll(`.${AUTOFILL_BUTTON_CLASS}`).forEach((button) => {
        positionAutofillButton(button, button._keypassguardInput);
    });
});
scanLoginForms();
