// RVCE WiFi Auto-Login Service Worker (v2.3.1)
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

const DEFAULT_PORTAL_IP = "172.16.0.4:8090"; // RVCE Sophos Gateway
const BUILTIN_PORTAL_IPS = ["172.16.0.4:8090", "172.16.0.2:1003", "172.16.0.4", "172.16.0.2"];
const SCRIPT_ID = "rvce-dynamic-portal-script";

async function syncDynamicContentScript(portalIp) {
    if (!chrome.scripting || !chrome.scripting.registerContentScripts) return;

    try {
        const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
        if (existing && existing.length > 0) {
            await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
            console.log("[RVCE Service Worker] Unregistered previous dynamic script.");
        }
    } catch (e) {
        console.log("[RVCE Service Worker] Script cleanup check:", e);
    }

    const cleanHost = (portalIp || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

    // Only register dynamic script if it is customized and not already covered by manifest default matches
    if (cleanHost && !BUILTIN_PORTAL_IPS.includes(cleanHost)) {
        try {
            await chrome.scripting.registerContentScripts([
                {
                    id: SCRIPT_ID,
                    matches: [`http://${cleanHost}/*`, `https://${cleanHost}/*`],
                    js: ["content-script.js"],
                    runAt: "document_end",
                    persistAcrossSessions: true
                }
            ]);
            console.log(`[RVCE Service Worker] Registered dynamic content script for custom portal: ${cleanHost}`);
        } catch (err) {
            console.log("[RVCE Service Worker] Dynamic script registration notice:", err);
        }
    }
}

chrome.runtime.onInstalled.addListener(() => {
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    const version = chrome.runtime.getManifest().version;
    console.log(`RVCE WiFi Auto-Login Extension Installed/Updated: v${version}`);

    // Initialize default settings if not already present
    chrome.storage.local.get(["refreshInterval", "portalIp"], (result) => {
        const updates = {};
        if (!result.refreshInterval) updates.refreshInterval = 5;
        if (!result.portalIp || result.portalIp === "172.16.0.2:1003") {
            updates.portalIp = DEFAULT_PORTAL_IP;
        }
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates);
        }
        syncDynamicContentScript(result.portalIp || DEFAULT_PORTAL_IP);
    });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["portalIp"], (result) => {
        syncDynamicContentScript(result.portalIp || DEFAULT_PORTAL_IP);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === "updatePortalIp") {
        syncDynamicContentScript(message.portalIp);
        sendResponse({ status: "synced" });
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
                        const a = document.querySelector("a[href*='submitRequest']");
                        if (a) {
                            const href = a.getAttribute("href") || "";
                            if (href.startsWith("javascript:")) {
                                eval(href.substring(11));
                                return;
                            }
                            a.click();
                            return;
                        }
                        const btn = document.getElementById("loginbutton") ||
                                    document.querySelector("button[type='submit'], input[type='submit'], .button");
                        if (btn) btn.click();
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
