document.addEventListener("DOMContentLoaded", function () {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const saveButton = document.getElementById("save");
    const statusText = document.getElementById("status");

    function showStatus(text, isError = false) {
        statusText.textContent = text;
        statusText.style.color = isError ? "#d93025" : "#333";
    }

    chrome.storage.local.get(["username", "password"], function (data) {
        if (data.username || data.password) {
            usernameInput.value = data.username || "";
            passwordInput.value = data.password || "";
            showStatus("Saved credentials loaded. Click Save to update.");
            saveButton.textContent = "Update saved credentials";
        } else {
            showStatus("Enter your WiFi username and password once, then click Save.");
        }
    });

    saveButton.addEventListener("click", function () {
        let username = usernameInput.value.trim();
        let password = passwordInput.value.trim();

        if (!username || !password) {
            showStatus("Please enter both username and password before saving.", true);
            return;
        }

        chrome.storage.local.set({ username, password }, function () {
            showStatus("Credentials saved successfully.");
            saveButton.textContent = "Update saved credentials";
        });
    });
});

  