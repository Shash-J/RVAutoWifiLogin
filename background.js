// RVCE WiFi Auto-Login Service Worker
chrome.runtime.onInstalled.addListener(() => {
    const version = chrome.runtime.getManifest().version;
    console.log(`RVCE WiFi Auto-Login Extension Installed/Updated: v${version}`);

    // Initialize default settings if not already present
    chrome.storage.local.get(["refreshInterval"], (result) => {
        if (!result.refreshInterval) {
            chrome.storage.local.set({ refreshInterval: 5 }, () => {
                console.log("Default refresh interval set to 5 minutes.");
            });
        }
    });
});

