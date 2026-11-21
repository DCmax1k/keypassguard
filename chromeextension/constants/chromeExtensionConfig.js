const KEYPASS_GUARD_EXTENSION_CONFIG = Object.freeze({
    // 'auto' follows the most recently used/changed Keypass Guard login.
    // Use 'production' or 'localhost' to only ever use one server.
    // Valid values: 'auto', 'production', 'localhost'
    serverMode: 'auto',
    apiBaseUrl: 'https://www.keypassguard.com',
    localhostApiBaseUrl: 'http://localhost:3001',
});
