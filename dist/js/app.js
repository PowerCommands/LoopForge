window.loopForge = window.loopForge || {};

window.loopForge.dropboxScopes = [
    "account_info.read",
    "files.metadata.read",
    "files.metadata.write",
    "files.content.read",
    "files.content.write"
];

window.loopForge.dropbox = {
    connect: async function (clientId, callbackPath) {
        if (!clientId || !clientId.trim()) {
            throw new Error("A Dropbox app key is required.");
        }

        const trimmedClientId = clientId.trim();
        const redirectUri = new URL(callbackPath || "auth/dropbox/callback", document.baseURI).toString();
        const codeVerifier = window.loopForge.dropbox.generateCodeVerifier();
        const codeChallenge = await window.loopForge.dropbox.createCodeChallenge(codeVerifier);
        const stateNonce = window.loopForge.dropbox.generateCodeVerifier();
        const targetOrigin = window.location.origin;
        const state = `${stateNonce}.${window.loopForge.dropbox.encodeBase64Url(targetOrigin)}`;
        const responseStorageKey = `loopForge.dropbox.auth.response.${state}`;
        const authorizeUrl = new URL("https://www.dropbox.com/oauth2/authorize");

        authorizeUrl.searchParams.set("client_id", trimmedClientId);
        authorizeUrl.searchParams.set("response_type", "code");
        authorizeUrl.searchParams.set("token_access_type", "offline");
        authorizeUrl.searchParams.set("code_challenge_method", "S256");
        authorizeUrl.searchParams.set("code_challenge", codeChallenge);
        authorizeUrl.searchParams.set("redirect_uri", redirectUri);
        authorizeUrl.searchParams.set("scope", window.loopForge.dropboxScopes.join(" "));
        authorizeUrl.searchParams.set("state", state);

        const popup = window.open(authorizeUrl.toString(), "loopForgeDropboxConnect", "width=720,height=820,resizable=yes,scrollbars=yes");
        if (!popup) {
            throw new Error("The Dropbox sign-in window was blocked. Allow pop-ups and try again.");
        }

        return await new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                cleanup();
                reject(new Error("Dropbox authorization timed out."));
            }, 180000);

            const interval = window.setInterval(() => {
                const storedResponse = window.loopForge.dropbox.consumeAuthorizationResponse(responseStorageKey);
                if (storedResponse) {
                    complete(storedResponse);
                }
            }, 500);

            const cleanup = () => {
                window.clearTimeout(timeout);
                window.clearInterval(interval);
                window.removeEventListener("message", handleMessage);
                window.localStorage.removeItem(responseStorageKey);

                try {
                    if (popup && popup.closed === false) {
                        popup.close();
                    }
                } catch {
                }
            };

            const complete = (message) => {
                if (!message || message.state !== state) {
                    cleanup();
                    reject(new Error("Dropbox authorization state validation failed."));
                    return;
                }

                if (message.error) {
                    cleanup();
                    reject(new Error(message.error));
                    return;
                }

                cleanup();
                resolve({
                    code: message.code || "",
                    codeVerifier: codeVerifier,
                    redirectUri: redirectUri
                });
            };

            const handleMessage = (event) => {
                if (event.origin !== window.location.origin) {
                    return;
                }

                const message = event.data;
                if (!message || message.type !== "loopForge.dropbox.auth") {
                    return;
                }

                complete(message);
            };

            window.addEventListener("message", handleMessage);
            window.localStorage.removeItem(responseStorageKey);
        });
    },
    consumeAuthorizationResponse: function (storageKey) {
        const json = window.localStorage.getItem(storageKey);
        if (!json) {
            return null;
        }

        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    },
    generateCodeVerifier: function () {
        const bytes = new Uint8Array(32);
        window.crypto.getRandomValues(bytes);
        return window.loopForge.dropbox.toBase64Url(bytes);
    },
    createCodeChallenge: async function (codeVerifier) {
        const data = new TextEncoder().encode(codeVerifier);
        const digest = await window.crypto.subtle.digest("SHA-256", data);
        return window.loopForge.dropbox.toBase64Url(new Uint8Array(digest));
    },
    encodeBase64Url: function (value) {
        const bytes = new TextEncoder().encode(value);
        return window.loopForge.dropbox.toBase64Url(bytes);
    },
    toBase64Url: function (bytes) {
        let binary = "";
        for (let index = 0; index < bytes.length; index++) {
            binary += String.fromCharCode(bytes[index]);
        }

        return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
};
