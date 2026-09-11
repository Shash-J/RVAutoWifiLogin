// RVCE WiFi Auto-Login Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("RVCE WiFi Auto-Login Extension Installed/Updated.");

    // Initialize default settings if not already present
    chrome.storage.local.get(["refreshInterval"], (result) => {
        if (!result.refreshInterval) {
            chrome.storage.local.set({ refreshInterval: 5 }, () => {
                console.log("Default refresh interval set to 5 minutes.");
            });
        }
    });
});

