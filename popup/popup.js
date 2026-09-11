document.addEventListener("DOMContentLoaded", function () {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const refreshIntervalInput = document.getElementById("refreshInterval");
    const saveButton = document.getElementById("save");
    const clearButton = document.getElementById("clear");
    const statusText = document.getElementById("status");

    function showStatus(text, isError = false) {
        statusText.textContent = text;
        if (isError) {
            statusText.style.background = "#fee2e2";
            statusText.style.color = "#b91c1c";
        } else {
            statusText.style.background = "#dcfce7";
            statusText.style.color = "#15803d";
        }
    }

    // Load saved settings
    chrome.storage.local.get(["username", "password", "refreshInterval"], function (data) {
        if (data.username || data.password) {
            usernameInput.value = data.username || "";
            passwordInput.value = data.password || "";
            showStatus("Saved configuration loaded. Ready to connect.");
            saveButton.textContent = "Update Settings";
        } else {
            statusText.textContent = "Enter your RVCE WiFi credentials once and click Save.";
            statusText.style.background = "#e0f2fe";
            statusText.style.color = "#0369a1";
        }

        refreshIntervalInput.value = data.refreshInterval !== undefined ? data.refreshInterval : 5;
    });

    // Save settings
    saveButton.addEventListener("click", function () {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let refreshInterval = parseInt(refreshIntervalInput.value, 10);

        if (!username || !password) {
            showStatus("Please enter both username and password before saving.", true);
            return;
        }

        if (isNaN(refreshInterval) || refreshInterval < 1) {
            refreshInterval = 5;
            refreshIntervalInput.value = 5;
        }

        chrome.storage.local.set({ username, password, refreshInterval }, function () {
            showStatus("Settings saved successfully! Keepalive interval: " + refreshInterval + " min.");
            saveButton.textContent = "Update Settings";
        });
    });

    // Clear credentials
    clearButton.addEventListener("click", function () {
        chrome.storage.local.remove(["username", "password", "sessionArmed"], function () {
            sessionStorage.removeItem("rv_session_armed");
            usernameInput.value = "";
            passwordInput.value = "";
            refreshIntervalInput.value = 5;
            saveButton.textContent = "Save Settings";
            showStatus("Saved credentials and active session cleared.");
        });
    });
});


  