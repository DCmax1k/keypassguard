globalThis.__keypassGuardContentInitialized = true;

function collectInputElements(root = document) {
    const inputs = [];
    for (const element of root.querySelectorAll('*')) {
        if (element instanceof HTMLInputElement) inputs.push(element);
        if (element.shadowRoot) inputs.push(...collectInputElements(element.shadowRoot));
    }
    return inputs;
}

function findUsernameInput() {
    const inputs = collectInputElements(document);
    return inputs.find((field) => (
        field.isConnected
        && !field.disabled
        && field.type !== 'hidden'
        && field.type !== 'password'
        && field.getClientRects().length > 0
        && (/^(email|username|text)$/i.test(field.type)
            || /email|username|userid|accountname|login|apple.?id/i.test(
                `${field.autocomplete} ${field.name} ${field.id} ${field.placeholder}`,
            ))
    )) || null;
}

function findPasswordInput() {
    return collectInputElements(document).find((field) => (
        field.isConnected
        && !field.disabled
        && field.type === 'password'
        && field.getClientRects().length > 0
    )) || null;
}

function setInputValue(field, value) {
    if (!field || !field.isConnected || !value) return false;
    field.focus({ preventScroll: true });
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!descriptor || !descriptor.set) return false;
    descriptor.set.call(field, value);
    field.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: value }));
    field.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'fillSelectedCredential') return false;

    const credential = message.credential || {};
    let filled = false;
    if (credential.field === 'username') {
        const active = document.activeElement;
        const target = active && active instanceof HTMLInputElement
            && active.type !== 'password'
            && active.type !== 'hidden'
            ? active
            : findUsernameInput();
        filled = setInputValue(target, credential.username);
    } else if (credential.field === 'password') {
        const active = document.activeElement;
        const target = active && active instanceof HTMLInputElement && active.type === 'password'
            ? active
            : findPasswordInput();
        filled = setInputValue(target, credential.password);
    }

    sendResponse(filled
        ? { ok: true }
        : { ok: false, error: 'No matching login field was available.' });
    return false;
});
