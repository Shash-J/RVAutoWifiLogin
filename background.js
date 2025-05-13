chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed!");

    // Ensure storage permission is working
    chrome.storage.local.set({
        username: "shashankajois.cs23",
        password: "cse@1431"
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving credentials:", chrome.runtime.lastError);
        } else {
            console.log("Credentials saved successfully!");
        }
    });
});

// Listen for messages (optional, for debugging)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCredentials") {
        chrome.storage.local.get(["username", "password"], (data) => {
            sendResponse(data);
        });
        return true; // Keep the message channel open for async response
    }
});
