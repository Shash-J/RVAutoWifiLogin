// RVCE WiFi Auto-Login Popup Controller (v2.4.0)
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

document.addEventListener("DOMContentLoaded", function () {
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    const extVersionEl = document.getElementById("extVersion");
    if (extVersionEl && chrome.runtime && chrome.runtime.getManifest) {
        extVersionEl.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    const DEFAULT_PORTAL_IP = "rvce-fw.rvce.edu.in:8090"; // Official RVCE Sophos Portal
    const BUILTIN_HOSTNAMES = ["rvce-fw.rvce.edu.in", "172.16.0.4", "172.16.0.2"];

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const portalIpInput = document.getElementById("portalIp");
    const resetIpButton = document.getElementById("resetIp");
    const presetRvceFwBtn = document.getElementById("presetRvceFw");
    const presetSophosBtn = document.getElementById("presetSophos");
    const presetFortinetBtn = document.getElementById("presetFortinet");
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

    /**
     * Parses user-entered portal URL/IP/domain cleanly.
     * Supports full URLs (e.g. https://rvce-fw.rvce.edu.in:8090/httpclient.html) or host:port.
     * Returns { hostPort, hostname }.
     */
    function parsePortalInput(val) {
        const raw = (val || "").trim();
        if (!raw) return { hostPort: "", hostname: "" };
        try {
            const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
            const parsed = new URL(withProto);
            return {
                hostPort: parsed.host,       // e.g. "rvce-fw.rvce.edu.in:8090"
                hostname: parsed.hostname    // e.g. "rvce-fw.rvce.edu.in" (port-free for Chrome permissions)
            };
        } catch (e) {
            const cleaned = raw.replace(/^https?:\/\//i, "").split("/")[0].trim();
            return {
                hostPort: cleaned,
                hostname: cleaned.split(":")[0].trim()
            };
        }
    }

    function updatePresetHighlight(currentHostPort) {
        const hostname = parsePortalInput(currentHostPort).hostname;
        if (presetRvceFwBtn) {
            presetRvceFwBtn.classList.toggle("active", hostname === "rvce-fw.rvce.edu.in");
        }
        if (presetSophosBtn) {
            presetSophosBtn.classList.toggle("active", hostname === "172.16.0.4");
        }
        if (presetFortinetBtn) {
            presetFortinetBtn.classList.toggle("active", hostname === "172.16.0.2");
        }
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

        const parsedSaved = parsePortalInput(data.portalIp);
        savedPortalIp = parsedSaved.hostPort || DEFAULT_PORTAL_IP;
        portalIpInput.value = savedPortalIp;
        updatePresetHighlight(savedPortalIp);
        refreshIntervalInput.value = data.refreshInterval !== undefined ? data.refreshInterval : 5;
    });

    // Preset button handlers
    if (presetRvceFwBtn) {
        presetRvceFwBtn.addEventListener("click", function () {
            portalIpInput.value = "rvce-fw.rvce.edu.in:8090";
            updatePresetHighlight("rvce-fw.rvce.edu.in:8090");
            showStatus("Selected RVCE Portal (rvce-fw.rvce.edu.in:8090). Click Save to apply.");
        });
    }

    if (presetSophosBtn) {
        presetSophosBtn.addEventListener("click", function () {
            portalIpInput.value = "172.16.0.4:8090";
            updatePresetHighlight("172.16.0.4:8090");
            showStatus("Selected Sophos IP (172.16.0.4:8090). Click Save to apply.");
        });
    }

    if (presetFortinetBtn) {
        presetFortinetBtn.addEventListener("click", function () {
            portalIpInput.value = "172.16.0.2:1003";
            updatePresetHighlight("172.16.0.2:1003");
            showStatus("Selected Fortinet (172.16.0.2:1003). Click Save to apply.");
        });
    }

    // Reset IP to default
    resetIpButton.addEventListener("click", function () {
        portalIpInput.value = DEFAULT_PORTAL_IP;
        updatePresetHighlight(DEFAULT_PORTAL_IP);
        showStatus("Portal reset to official RVCE gateway: " + DEFAULT_PORTAL_IP);
    });

    portalIpInput.addEventListener("input", function () {
        updatePresetHighlight(portalIpInput.value);
    });

    function syncBackgroundPortal(portalIpToSave, refreshInterval) {
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "updatePortalIp", portalIp: portalIpToSave }, function (resp) {
                if (resp && resp.detail && resp.detail.ok === false) {
                    showStatus("Warning: Could not register custom portal script (" + (resp.detail.error || "unknown") + ").", true);
                } else {
                    showStatus(`Settings saved! Portal: ${portalIpToSave} • Keepalive: ${refreshInterval}m (Reload portal tab if open)`);
                }
            });
        }
    }

    // Perform the actual save
    function executeSave(parsedPortal) {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        let refreshInterval = parseInt(refreshIntervalInput.value, 10);

        if (isNaN(refreshInterval) || refreshInterval < 1) {
            refreshInterval = 5;
            refreshIntervalInput.value = 5;
        }

        const portalIpToSave = parsedPortal.hostPort || DEFAULT_PORTAL_IP;
        const hostname = parsedPortal.hostname || "rvce-fw.rvce.edu.in";

        savedPortalIp = portalIpToSave;
        portalIpInput.value = portalIpToSave;
        updatePresetHighlight(portalIpToSave);

        chrome.storage.local.set({ username, password, refreshInterval, portalIp: portalIpToSave }, function () {
            showStatus(`Settings saved! Portal: ${portalIpToSave} • Keepalive: ${refreshInterval}m`);
            saveButton.textContent = "Update Settings";

            // Request permission dynamically for custom host (MUST NOT contain :port in match pattern!)
            if (!BUILTIN_HOSTNAMES.includes(hostname) && chrome.permissions && chrome.permissions.request) {
                chrome.permissions.request(
                    {
                        origins: [`*://${hostname}/*`]
                    },
                    function (granted) {
                        console.log("[RVCE Popup] Permission request for", hostname, "granted:", granted);
                        if (chrome.runtime.lastError) {
                            console.log("[RVCE Popup] Permission error:", chrome.runtime.lastError.message);
                        }
                        if (granted) {
                            syncBackgroundPortal(portalIpToSave, refreshInterval);
                        } else {
                            showStatus(`Saved credentials, but permission for ${hostname} was denied. Extension cannot run on custom portal without permission.`, true);
                        }
                    }
                );
            } else {
                syncBackgroundPortal(portalIpToSave, refreshInterval);
            }
        });
    }

    // Save settings button handler
    saveButton.addEventListener("click", function () {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const parsed = parsePortalInput(portalIpInput.value);
        const currentEnteredIp = parsed.hostPort || DEFAULT_PORTAL_IP;
        const hostname = parsed.hostname || "rvce-fw.rvce.edu.in";

        if (!username || !password) {
            showStatus("Please enter both username and password before saving.", true);
            return;
        }

        // Only warn if user changes to an unknown/unrecognized third-party host
        if (!BUILTIN_HOSTNAMES.includes(hostname) && currentEnteredIp !== savedPortalIp) {
            modalBodyText.innerHTML = `You are modifying the Portal Gateway to <strong>${currentEnteredIp}</strong>.<br><br>⚠️ Standard RVCE campus portals are <strong>rvce-fw.rvce.edu.in:8090</strong>, <strong>172.16.0.4:8090</strong>, and <strong>172.16.0.2:1003</strong>. Only proceed if your campus block uses this custom address.`;
            ipWarningModal.classList.remove("hidden");
            return;
        }

        executeSave(parsed.hostPort ? parsed : parsePortalInput(DEFAULT_PORTAL_IP));
    });

    // Modal Confirmation Handlers
    confirmIpChangeBtn.addEventListener("click", function () {
        ipWarningModal.classList.add("hidden");
        const parsed = parsePortalInput(portalIpInput.value);
        executeSave(parsed.hostPort ? parsed : parsePortalInput(DEFAULT_PORTAL_IP));
    });

    cancelIpChangeBtn.addEventListener("click", function () {
        ipWarningModal.classList.add("hidden");
        portalIpInput.value = savedPortalIp;
        updatePresetHighlight(savedPortalIp);
        showStatus("Retained previous Portal Gateway: " + savedPortalIp);
    });

    // Clear credentials
    clearButton.addEventListener("click", function () {
        chrome.storage.local.remove(["username", "password", "sessionArmed", "portalIp"], function () {
            sessionStorage.removeItem("rvce_session_armed");
            usernameInput.value = "";
            passwordInput.value = "";
            portalIpInput.value = DEFAULT_PORTAL_IP;
            savedPortalIp = DEFAULT_PORTAL_IP;
            updatePresetHighlight(DEFAULT_PORTAL_IP);
            refreshIntervalInput.value = 5;
            saveButton.textContent = "Save Settings";
            showStatus("Saved credentials and custom portal settings cleared.");

            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: "updatePortalIp", portalIp: DEFAULT_PORTAL_IP });
            }
        });
    });
});
