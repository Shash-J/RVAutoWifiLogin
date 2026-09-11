// RVCE WiFi Auto-Login Service Worker
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

chrome.runtime.onInstalled.addListener(() => {
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
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

