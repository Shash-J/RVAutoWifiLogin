// RVCE WiFi Auto-Login Popup Controller
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

document.addEventListener("DOMContentLoaded", function () {
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    const extVersionEl = document.getElementById("extVersion");
    if (extVersionEl && chrome.runtime && chrome.runtime.getManifest) {
        extVersionEl.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    const DEFAULT_PORTAL_IP = "172.16.0.2:1003";

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const portalIpInput = document.getElementById("portalIp");
    const resetIpButton = document.getElementById("resetIp");
    const refreshIntervalInput = document.getElementById("refreshInterval");
    const saveButton = document.getElementById("save");
    const clearButton = document.getElementById("clear");
    const statusText = document.getElementById("status");

    // Modal elements
    const ipWarningModal = document.getElementById("ipWarningModal");
    const confirmIpChangeBtn = document.getElementById("confirmIpChange");
    const cancelIpChangeBtn = document.getElementById("cancelIpChange");
    const modalBodyText = document.getElementById("modalBodyText");

    let savedPortalIp = DEFAULT_PORTAL_IP;

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

    function cleanHost(val) {
        return (val || "")
            .trim()
            .replace(/^https?:\/\//i, "")
            .replace(/\/+$/, "");
    }

    // Load saved settings
    chrome.storage.local.get(["username", "password", "refreshInterval", "portalIp"], function (data) {
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

        savedPortalIp = data.portalIp ? cleanHost(data.portalIp) : DEFAULT_PORTAL_IP;
        portalIpInput.value = savedPortalIp;
        refreshIntervalInput.value = data.refreshInterval !== undefined ? data.refreshInterval : 5;
    });

    // Reset IP to default
    resetIpButton.addEventListener("click", function () {
        portalIpInput.value = DEFAULT_PORTAL_IP;
        showStatus("Portal IP reset to standard RVCE default: " + DEFAULT_PORTAL_IP);
    });

    // Perform the actual save
    function executeSave(portalIpToSave) {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let refreshInterval = parseInt(refreshIntervalInput.value, 10);

        if (isNaN(refreshInterval) || refreshInterval < 1) {
            refreshInterval = 5;
            refreshIntervalInput.value = 5;
        }

        savedPortalIp = portalIpToSave;
        portalIpInput.value = portalIpToSave;

        chrome.storage.local.set({ username, password, refreshInterval, portalIp: portalIpToSave }, function () {
            showStatus(`Settings saved! Portal: ${portalIpToSave} • Keepalive: ${refreshInterval}m`);
            saveButton.textContent = "Update Settings";

            // Request permission dynamically for custom host if not default
            if (portalIpToSave !== DEFAULT_PORTAL_IP && chrome.permissions && chrome.permissions.request) {
                chrome.permissions.request(
                    {
                        origins: [`http://${portalIpToSave}/*`, `https://${portalIpToSave}/*`]
                    },
                    function (granted) {
                        console.log("[RVCE Popup] Permission request granted:", granted);
                    }
                );
            }

            // Notify background worker to synchronize dynamic script registration
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "updatePortalIp", portalIp: portalIpToSave });
            }
        });
    }

    // Save settings button handler
    saveButton.addEventListener("click", function () {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const currentEnteredIp = cleanHost(portalIpInput.value) || DEFAULT_PORTAL_IP;

        if (!username || !password) {
            showStatus("Please enter both username and password before saving.", true);
            return;
        }

        // Check if user is attempting to change from standard default IP
        if (currentEnteredIp !== DEFAULT_PORTAL_IP && currentEnteredIp !== savedPortalIp) {
            modalBodyText.innerHTML = `You are modifying the Portal Gateway to <strong>${currentEnteredIp}</strong>.<br><br>⚠️ The standard RVCE campus gateway is <strong>${DEFAULT_PORTAL_IP}</strong>. Only proceed if your specific campus block uses this custom address.`;
            ipWarningModal.classList.remove("hidden");
            return;
        }

        executeSave(currentEnteredIp);
    });

    // Modal Confirmation Handlers
    confirmIpChangeBtn.addEventListener("click", function () {
        ipWarningModal.classList.add("hidden");
        const currentEnteredIp = cleanHost(portalIpInput.value) || DEFAULT_PORTAL_IP;
        executeSave(currentEnteredIp);
    });

    cancelIpChangeBtn.addEventListener("click", function () {
        ipWarningModal.classList.add("hidden");
        portalIpInput.value = savedPortalIp;
        showStatus("Retained previous Portal Gateway IP: " + savedPortalIp);
    });

    // Clear credentials
    clearButton.addEventListener("click", function () {
        chrome.storage.local.remove(["username", "password", "sessionArmed", "portalIp"], function () {
            sessionStorage.removeItem("rvce_session_armed");
            usernameInput.value = "";
            passwordInput.value = "";
            portalIpInput.value = DEFAULT_PORTAL_IP;
            savedPortalIp = DEFAULT_PORTAL_IP;
            refreshIntervalInput.value = 5;
            saveButton.textContent = "Save Settings";
            showStatus("Saved credentials and custom portal settings cleared.");

            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "updatePortalIp", portalIp: DEFAULT_PORTAL_IP });
            }
        });
    });
});


  