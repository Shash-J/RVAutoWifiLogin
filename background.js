// RVCE WiFi Auto-Login Service Worker
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

const DEFAULT_PORTAL_IP = "172.16.0.2:1003";
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

    // Only register dynamic script if it is customized and different from the default manifest match
    if (cleanHost && cleanHost !== DEFAULT_PORTAL_IP) {
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
        if (!result.portalIp) updates.portalIp = DEFAULT_PORTAL_IP;
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
    }
    return true;
});

