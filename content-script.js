/**
 * RVCE WiFi Auto-Login State Machine Engine (v2.0)
 * 
 * States:
 * 1. COLD_START_LOGIN : First connect / laptop boot. Prompts user with "Auto-Continue" green banner.
 * 2. SESSION_ACTIVE   : On /keepalive page. Displays countdown pill and auto-reloads every N minutes.
 * 3. AUTO_RECONNECT   : On /login with session armed. Automatically fills and signs in (zero-click).
 * 4. LOGOUT_RECOVERY  : On "successfully log out" page. Immediately redirects to login.
 */

(function () {
  "use strict";

  console.log("[RVCE Auto-Login Engine] Initializing on:", window.location.href);

  // --- Helper Selectors ---
  function findUsernameField() {
    return document.querySelector(
      'input[name="username"], input[name="user"], input[name="auth_user"], input[placeholder*="Username" i], input[type="text"], input[type="email"]'
    );
  }

  function findPasswordField() {
    return document.querySelector(
      'input[name="password"], input[name="pass"], input[placeholder*="Password" i], input[type="password"]'
    );
  }

  function findLoginButton() {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    return (
      buttons.find((el) => {
        const text = (el.innerText || el.value || "").trim().toLowerCase();
        return /sign in|sign-in|login|continue|submit|connect/.test(text);
      }) || document.querySelector('button[type="submit"], input[type="submit"]')
    );
  }

  function setInputValue(element, value) {
    if (!element) return;
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // --- Page Classification ---
  function isLogoutPage() {
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    const url = window.location.href.toLowerCase();
    return (
      url.includes("/logout") ||
      text.includes("successfully log out") ||
      text.includes("successfully logged out") ||
      text.includes("you have logged out") ||
      text.includes("session terminated")
    );
  }

  function isKeepalivePage() {
    const url = window.location.href.toLowerCase();
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    return (
      url.includes("/keepalive") ||
      text.includes("secure operations center") ||
      text.includes("session monitor") ||
      text.includes("authentication refresh cycle") ||
      text.includes("session active")
    );
  }

  function isLoginPage() {
    return Boolean(findUsernameField() && findPasswordField());
  }

  function hasAuthError() {
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    return (
      text.includes("invalid username or password") ||
      text.includes("authentication failed") ||
      text.includes("login failed")
    );
  }

  // --- UI Components ---
  function injectTopBanner(text, backgroundColor = "#28a745", cursor = "pointer") {
    let existing = document.getElementById("rvce-auto-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "rvce-auto-banner";
    banner.textContent = text;
    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      backgroundColor: backgroundColor,
      color: "#ffffff",
      textAlign: "center",
      padding: "12px 0",
      fontSize: "16px",
      fontWeight: "bold",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      cursor: cursor,
      zIndex: "999999",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      letterSpacing: "0.5px",
      userSelect: "none",
      transition: "background-color 0.2s ease"
    });

    document.body.prepend(banner);
    return banner;
  }

  function injectKeepaliveBadge(remainingSeconds, onManualRefresh) {
    let badge = document.getElementById("rvce-keepalive-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "rvce-keepalive-badge";
      Object.assign(badge.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        backgroundColor: "#16a34a",
        color: "#ffffff",
        padding: "8px 16px",
        borderRadius: "24px",
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        zIndex: "999999",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none"
      });

      const textSpan = document.createElement("span");
      textSpan.id = "rvce-badge-text";
      badge.appendChild(textSpan);

      const refreshBtn = document.createElement("button");
      refreshBtn.textContent = "↻ Refresh";
      Object.assign(refreshBtn.style, {
        background: "rgba(255,255,255,0.25)",
        color: "#ffffff",
        border: "none",
        borderRadius: "12px",
        padding: "3px 8px",
        fontSize: "11px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "background 0.2s"
      });
      refreshBtn.addEventListener("mouseenter", () => {
        refreshBtn.style.background = "rgba(255,255,255,0.4)";
      });
      refreshBtn.addEventListener("mouseleave", () => {
        refreshBtn.style.background = "rgba(255,255,255,0.25)";
      });
      refreshBtn.addEventListener("click", onManualRefresh);
      badge.appendChild(refreshBtn);

      document.body.appendChild(badge);
    }

    const textSpan = document.getElementById("rvce-badge-text");
    if (textSpan) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const formatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      textSpan.textContent = `🛡️ RVCE Keepalive Active • Refresh in ${formatted}`;
    }
  }

  // --- Perform Login Routine ---
  function performLogin(data, onSuccess, onFail) {
    if (!data.username || !data.password) {
      if (onFail) onFail("No credentials configured. Please enter them in the extension popup.");
      return;
    }

    const usernameField = findUsernameField();
    const passwordField = findPasswordField();
    const loginButton = findLoginButton();

    if (usernameField && passwordField) {
      setInputValue(usernameField, data.username);
      setInputValue(passwordField, data.password);
      console.log("[RVCE Auto-Login] Credentials populated.");

      if (loginButton) {
        if (onSuccess) onSuccess();
        setTimeout(() => {
          loginButton.click();
          console.log("[RVCE Auto-Login] Sign In button clicked.");
        }, 300);
      } else {
        if (onFail) onFail("Sign In button could not be located on the page.");
      }
    } else {
      if (onFail) onFail("Login input fields could not be found.");
    }
  }

  // --- Main State Machine Controller ---
  function runStateMachine() {
    // STATE 4: LOGOUT RECOVERY
    if (isLogoutPage()) {
      console.log("[RVCE State Machine] State: LOGOUT_RECOVERY");
      injectTopBanner("🔄 Session logged out. Redirecting to RVCE login...", "#d97706", "default");
      setTimeout(() => {
        window.location.href = "https://172.16.0.2:1003/login";
      }, 500);
      return;
    }

    // STATE 2: SESSION ACTIVE (Keepalive Page)
    if (isKeepalivePage()) {
      console.log("[RVCE State Machine] State: SESSION_ACTIVE");

      // Mark session as armed across page reloads and storage
      sessionStorage.setItem("rvce_session_armed", "true");
      chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

      // Listen for user manual termination to disarm
      document.querySelectorAll("a").forEach((link) => {
        if (/terminate session|logout/i.test(link.innerText || "")) {
          link.addEventListener("click", () => {
            console.log("[RVCE State Machine] User manually terminated session. Disarming.");
            sessionStorage.removeItem("rvce_session_armed");
            chrome.storage.local.set({ sessionArmed: false });
          });
        }
      });

      // Load user configured refresh interval (default 5 min)
      chrome.storage.local.get(["refreshInterval"], (result) => {
        const intervalMinutes = (result.refreshInterval && result.refreshInterval >= 1) ? result.refreshInterval : 5;
        let remainingSeconds = intervalMinutes * 60;

        const manualReload = () => {
          console.log("[RVCE Auto-Login] Manual refresh requested.");
          window.location.reload();
        };

        injectKeepaliveBadge(remainingSeconds, manualReload);

        const countdownInterval = setInterval(() => {
          remainingSeconds--;
          if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            console.log("[RVCE Auto-Login] Keepalive interval expired. Reloading to reset timer...");
            window.location.reload();
          } else {
            injectKeepaliveBadge(remainingSeconds, manualReload);
          }
        }, 1000);
      });

      return;
    }

    // STATE 1 & STATE 3: LOGIN PAGE
    if (isLoginPage()) {
      // Check for authentication failure errors
      if (hasAuthError()) {
        console.warn("[RVCE State Machine] Authentication failed detected. Disarming auto-login to prevent loop.");
        sessionStorage.removeItem("rvce_session_armed");
        chrome.storage.local.set({ sessionArmed: false });
        injectTopBanner("❌ Authentication Failed: Please check your credentials in the extension popup.", "#dc2626", "default");
        return;
      }

      // Check if session is armed (from previous Auto-Continue or keepalive session)
      chrome.storage.local.get(["username", "password", "sessionArmed", "lastKeepalive"], (storageData) => {
        const sessionArmedLocal = sessionStorage.getItem("rvce_session_armed") === "true";
        const storageArmed = storageData.sessionArmed === true && (Date.now() - (storageData.lastKeepalive || 0) < 12 * 3600 * 1000);
        const isArmed = sessionArmedLocal || storageArmed;

        if (isArmed) {
          // STATE 3: AUTO_RECONNECT (Zero-click)
          console.log("[RVCE State Machine] State: AUTO_RECONNECT (Session armed). Triggering zero-click login.");
          const banner = injectTopBanner("🔄 RVCE WiFi: Auto-Reconnecting...", "#2563eb", "wait");

          setTimeout(() => {
            performLogin(
              storageData,
              () => {
                banner.textContent = "Connecting to RVCE WiFi...";
                banner.style.backgroundColor = "#16a34a";
              },
              (errMessage) => {
                banner.textContent = "⚠️ " + errMessage;
                banner.style.backgroundColor = "#dc2626";
              }
            );
          }, 600);
        } else {
          // STATE 1: COLD_START_LOGIN (Manual user prompt)
          console.log("[RVCE State Machine] State: COLD_START_LOGIN. Showing Auto-Continue banner.");
          const banner = injectTopBanner("Auto-Continue", "#28a745", "pointer");

          banner.addEventListener("mouseenter", () => {
            banner.style.backgroundColor = "#218838";
          });
          banner.addEventListener("mouseleave", () => {
            banner.style.backgroundColor = "#28a745";
          });

          banner.addEventListener("click", () => {
            banner.textContent = "Connecting...";
            banner.style.backgroundColor = "#16a34a";

            // Arm the session
            sessionStorage.setItem("rvce_session_armed", "true");
            chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

            performLogin(
              storageData,
              null,
              (errMessage) => {
                alert(errMessage);
                banner.textContent = "Auto-Continue";
                banner.style.backgroundColor = "#28a745";
                sessionStorage.removeItem("rvce_session_armed");
                chrome.storage.local.set({ sessionArmed: false });
              }
            );
          });
        }
      });

      return;
    }

    console.log("[RVCE State Machine] Page is neither login, keepalive, nor logout.");
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runStateMachine);
  } else {
    runStateMachine();
  }
})();

