// RVCE WiFi Auto-Login Service Worker (v2.4.0)
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

const DEFAULT_PORTAL_IP = "rvce-fw.rvce.edu.in:8090"; // Official RVCE Sophos Portal
const BUILTIN_HOSTNAMES = ["rvce-fw.rvce.edu.in", "172.16.0.4", "172.16.0.2"];
const SCRIPT_ID = "rvce-dynamic-portal-script";
const BRIDGE_SCRIPT_ID = "rvce-dynamic-bridge-script";

/**
 * Extracts pure hostname (without scheme, path, or :port) for valid Chrome match patterns.
 * Chrome forbids :port inside match patterns (e.g. *://host:8090/* throws Invalid match pattern).
 * Omitting the port (*://host/*) automatically matches ALL ports including 8090 and 1003.
 */
function extractHostname(portalValue) {
    const raw = (portalValue || "").trim();
    if (!raw) return "";
    try {
        const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        return new URL(withProto).hostname;
    } catch (e) {
        return raw
            .replace(/^https?:\/\//i, "")
            .split("/")[0]
            .split(":")[0]
            .trim();
    }
}

async function syncDynamicContentScript(portalIp) {
    if (!chrome.scripting || !chrome.scripting.registerContentScripts) return { ok: false };

    try {
        const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID, BRIDGE_SCRIPT_ID] });
        if (existing && existing.length > 0) {
            await chrome.scripting.unregisterContentScripts({ ids: existing.map((s) => s.id) });
            console.log("[RVCE Service Worker] Unregistered previous dynamic scripts.");
        }
    } catch (e) {
        console.log("[RVCE Service Worker] Script cleanup check:", e);
    }

    const hostname = extractHostname(portalIp);

    // Only register dynamic scripts if hostname is custom and not already covered by manifest matches
    if (hostname && !BUILTIN_HOSTNAMES.includes(hostname)) {
        const matchPattern = `*://${hostname}/*`;
        try {
            await chrome.scripting.registerContentScripts([
                {
                    id: SCRIPT_ID,
                    matches: [matchPattern],
                    js: ["content-script.js"],
                    runAt: "document_end",
                    persistAcrossSessions: true
                },
                {
                    id: BRIDGE_SCRIPT_ID,
                    matches: [matchPattern],
                    js: ["page-bridge.js"],
                    world: "MAIN",
                    runAt: "document_start",
                    persistAcrossSessions: true
                }
            ]);
            console.log(`[RVCE Service Worker] Registered dynamic content scripts for: ${matchPattern}`);
            return { ok: true, matchPattern };
        } catch (err) {
            console.log("[RVCE Service Worker] Dynamic script registration notice:", err);
            return { ok: false, error: err.message };
        }
    }

    return { ok: true, builtin: true };
}

chrome.runtime.onInstalled.addListener(() => {
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    const version = chrome.runtime.getManifest().version;
    console.log(`RVCE WiFi Auto-Login Extension Installed/Updated: v${version}`);

    chrome.storage.local.get(["refreshInterval", "portalIp"], (result) => {
        const updates = {};
        if (!result.refreshInterval) updates.refreshInterval = 5;
        // Migrate legacy defaults to the latest official RVCE gateway
        if (!result.portalIp || result.portalIp === "172.16.0.2:1003" || result.portalIp === "172.16.0.4:8090") {
            updates.portalIp = DEFAULT_PORTAL_IP;
        }
        const effectivePortal = updates.portalIp || result.portalIp || DEFAULT_PORTAL_IP;
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates);
        }
        syncDynamicContentScript(effectivePortal);
    });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["portalIp"], (result) => {
        syncDynamicContentScript(result.portalIp || DEFAULT_PORTAL_IP);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === "updatePortalIp") {
        syncDynamicContentScript(message.portalIp).then((res) => {
            sendResponse({ status: "synced", detail: res });
        });
        return true;
    }

    // Execute native script in the page's MAIN world context (bypasses isolated world limitations)
    if (message && message.action === "executeInMainWorld") {
        if (sender && sender.tab && sender.tab.id && chrome.scripting) {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                world: "MAIN",
                func: () => {
                    try {
                        if (typeof submitRequest === "function") {
                            console.log("[RVCE Service Worker Main World] Calling submitRequest()");
                            submitRequest();
                            return;
                        }
                        const btn = document.getElementById("loginbutton") ||
                                    document.querySelector("button[type='submit'], input[type='submit'], .button");
                        if (btn && btn.tagName !== "A") {
                            btn.click();
                            return;
                        }
                        const form = document.querySelector("form");
                        if (form) form.submit();
                    } catch (e) {
                        console.log("[RVCE Service Worker Main World] Execution notice:", e);
                    }
                }
            }).then(() => sendResponse({ status: "executed" }))
              .catch((err) => sendResponse({ status: "error", message: err.message }));
            return true;
        }
    }

    return true;
});
