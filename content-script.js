/**
 * RVCE WiFi Auto-Login State Machine Engine (v2.3.0)
 * 
 * Multi-Gateway Support:
 * - Sophos Cyberoam / Sophos Firewall Portal (172.16.0.4:8090, httpclient.html)
 * - Fortinet FortiGate Captive Portal (172.16.0.2:1003, /keepalive, /fgtauth)
 * - Generic Captive Portals
 * 
 * States:
 * 1. COLD_START_LOGIN : First connect / laptop boot. Prompts user with "Auto-Continue" green banner.
 * 2. SESSION_ACTIVE   : On active session (/keepalive or httpclient.html logged in). Displays countdown pill.
 * 3. AUTO_RECONNECT   : On login page with session armed. Automatically fills and signs in (zero-click).
 * 4. LOGOUT_RECOVERY  : On "successfully log out" page. Cancels hung sockets via window.stop() & watchdog recovery.
 * 
 * Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
 */

(function () {
  "use strict";

  console.log("[RVCE Auto-Login Engine v2.3.0] Initializing on:", window.location.href);

  // --- Helper Selectors & Utilities ---
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
  function isVisible(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) &&
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden";
  }

  function findUsernameField() {
    const selectors = [
      "#username",
      "input[name='username']",
      "input[name='user']",
      "input[name='auth_user']",
      "input[id*='username' i]",
      "input[id*='user' i]",
      "input[placeholder*='username' i]",
      "input[placeholder*='user' i]",
      "input[type='text']",
      "input[type='email']"
    ];
    for (const sel of selectors) {
      const elements = Array.from(document.querySelectorAll(sel));
      const visible = elements.find(isVisible);
      if (visible) return visible;
    }
    // Fallback to first matching in DOM if none computed as visible yet
    return document.querySelector(selectors.join(", "));
  }

  function findPasswordField() {
    const selectors = [
      "#password",
      "input[name='password']",
      "input[name='pass']",
      "input[name='auth_pass']",
      "input[id*='password' i]",
      "input[id*='pass' i]",
      "input[placeholder*='password' i]",
      "input[type='password']"
    ];
    for (const sel of selectors) {
      const elements = Array.from(document.querySelectorAll(sel));
      const visible = elements.find(isVisible);
      if (visible) return visible;
    }
    return document.querySelector(selectors.join(", "));
  }

  /**
   * Universal Login / Sign-In Button Finder
   * Supports:
   * 1. Sophos Cyberoam / Sophos Firewall: <div id="loginbutton" class="button"> inside <a href="javascript:submitRequest()">
   * 2. Fortinet FortiGate: <input type="submit">, <button type="submit">
   * 3. Generic & Custom Portals: buttons, links, inputs matching sign-in / continue / submit
   * Strict Exclusion: Explicitly rejects "Sign out" / "Log out" / "Disconnect" buttons.
   */
  function findLoginButton() {
    // Tier 1: Dedicated ID & Known Gateway Selectors
    const dedicatedSelectors = [
      "#loginbutton",
      "a[href*='submitRequest']",
      "#loginbtn",
      "#loginBtn",
      "#login-btn",
      "#btnLogin",
      "#btn-login",
      "#submitButton",
      "#submitbtn",
      "#submitBtn",
      "#btnSubmit",
      "#signInBtn",
      "#btnSignIn",
      "button#submit",
      "input#submit"
    ];

    for (const sel of dedicatedSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.innerText || el.textContent || el.value || "").trim().toLowerCase();
        // Crucial safety: do NOT return if it says "sign out" or "logout"
        if (!/sign[\s-]?out|log[\s-]?out|disconnect/i.test(text)) {
          return el;
        }
      }
    }

    // Tier 2: Broad Semantic Candidate Search
    const broadQuery = "button, input[type='submit'], input[type='button'], a.button, a.btn, div.button, div.btn, span.button, span.btn, [role='button'], a[href*='submitRequest'], a[href*='login'], a[href^='javascript:']";
    const candidates = Array.from(document.querySelectorAll(broadQuery));

    const matchedCandidate = candidates.find((el) => {
      const text = (
        el.innerText ||
        el.textContent ||
        el.value ||
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        ""
      ).trim().toLowerCase();

      // Explicitly reject logout / cancel buttons
      if (/sign[\s-]?out|log[\s-]?out|disconnect|cancel/i.test(text)) {
        return false;
      }

      // Check for positive login / continue keywords
      if (/sign[\s-]?in|sign-in|log[\s-]?in|log-in|submit|continue|connect|authenticate|credential login|proceed|access internet/i.test(text)) {
        return true;
      }

      // Check onclick or href attributes
      const onclickAttr = el.getAttribute("onclick") || "";
      const hrefAttr = el.getAttribute("href") || "";
      if (/submitRequest|validateLogin|doLogin|login|auth/i.test(onclickAttr + hrefAttr)) {
        return true;
      }

      return false;
    });

    if (matchedCandidate) return matchedCandidate;

    // Tier 3: Form-Associated Submit Button
    const userField = findUsernameField();
    const form = userField ? userField.closest("form") : null;
    if (form) {
      const formSubmit = form.querySelector("button[type='submit'], input[type='submit'], button, input[type='button']");
      if (formSubmit) {
        const text = (formSubmit.innerText || formSubmit.value || "").trim().toLowerCase();
        if (!/sign[\s-]?out|log[\s-]?out/i.test(text)) {
          return formSubmit;
        }
      }
    }

    // Tier 4: Global First Submit Button (excluding logout)
    const genericSubmit = document.querySelector("button[type='submit'], input[type='submit']");
    if (genericSubmit) {
      const text = (genericSubmit.innerText || genericSubmit.value || "").trim().toLowerCase();
      if (!/sign[\s-]?out|log[\s-]?out/i.test(text)) {
        return genericSubmit;
      }
    }

    return null;
  }

  function triggerButtonClick(btn) {
    if (!btn) return;
    try {
      btn.focus();
    } catch (e) {}

    // Dispatch standard click
    btn.click();

    // If button is inside an <a> tag (e.g. Sophos <a href="javascript:submitRequest()"><div id="loginbutton">...</div></a>)
    const parentLink = btn.closest("a");
    if (parentLink && parentLink !== btn) {
      try {
        parentLink.click();
      } catch (e) {}
    }

    // If candidate has an inner clickable button
    const innerBtn = btn.querySelector("#loginbutton, .button, [role='button']");
    if (innerBtn && innerBtn !== btn) {
      try {
        innerBtn.click();
      } catch (e) {}
    }

    // Also dispatch full mouse events for frameworks listening to mousedown/mouseup
    try {
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  function setInputValue(element, value) {
    if (!element) return;
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }

  // --- Page Classification ---
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
  function isLogoutPage() {
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    const url = window.location.href.toLowerCase();

    // If we are currently active on Sophos or Fortinet, we are not logged out
    if (isKeepalivePage()) return false;

    return (
      url.includes("/logout") ||
      text.includes("successfully log out") ||
      text.includes("successfully logged out") ||
      text.includes("you have logged out") ||
      text.includes("you have been logged out") ||
      text.includes("session terminated")
    );
  }

  function isKeepalivePage() {
    const url = window.location.href.toLowerCase();
    const text = document.body ? document.body.innerText.toLowerCase() : "";

    // 1. Sophos Captive Portal Active Session Detection
    const credsEl = document.getElementById("credentials");
    const loggedinMsgEl = document.getElementById("loggedin-message");
    const loggedinViewEl = document.getElementById("loggedin-view");
    const loginBtnEl = document.getElementById("loginbutton");
    const loginBtnText = loginBtnEl ? (loginBtnEl.innerText || "").trim().toLowerCase() : "";

    const isSophosActive = (
      text.includes("you are signed in as") ||
      text.includes("you are signed in") ||
      text.includes("do not close this page") ||
      text.includes("if you do, you will be signed out") ||
      (credsEl && credsEl.classList.contains("loggedin")) ||
      (loggedinMsgEl && loggedinMsgEl.classList.contains("loggedin")) ||
      (loggedinViewEl && isVisible(loggedinViewEl)) ||
      loginBtnText === "sign out"
    );

    if (isSophosActive) {
      return true;
    }

    // 2. Fortinet & Standard Captive Portal Active Session Detection
    const isFortinetActive = (
      url.includes("/keepalive") ||
      text.includes("secure operations center") ||
      text.includes("session monitor") ||
      text.includes("authentication refresh cycle") ||
      text.includes("session active")
    );

    return isFortinetActive;
  }

  function isLoginPage() {
    // If already in active session or logout recovery, this is NOT a login page
    if (isKeepalivePage()) return false;
    if (isLogoutPage()) return false;

    // Must have username and password fields
    const userField = findUsernameField();
    const passField = findPasswordField();
    if (!userField || !passField) return false;

    // On Sophos, check if credentials container is hidden with 'loggedin'
    const credsContainer = document.getElementById("credentials");
    if (credsContainer && credsContainer.classList.contains("loggedin")) {
      return false;
    }

    // Make sure page does not display active session confirmation
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    if (text.includes("you are signed in") || text.includes("do not close this page")) {
      return false;
    }

    return true;
  }

  function hasAuthError() {
    const text = document.body ? document.body.innerText.toLowerCase() : "";
    const statusEl = document.getElementById("statusmessage");
    const statusText = statusEl ? (statusEl.innerText || "").toLowerCase() : "";
    const statusIsRed = statusEl && statusEl.className.includes("red");

    return (
      statusIsRed ||
      statusText.includes("fail") ||
      statusText.includes("invalid") ||
      statusText.includes("limit reached") ||
      text.includes("invalid username or password") ||
      text.includes("authentication failed") ||
      text.includes("login failed") ||
      text.includes("bad password") ||
      text.includes("maximum login limit")
    );
  }

  // --- UI Components ---
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
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

  function injectKeepaliveBadge(remainingSeconds, onManualRefresh, gatewayName = "") {
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
      const gwLabel = gatewayName ? ` [${gatewayName}]` : "";
      textSpan.textContent = `🛡️ RVCE Keepalive Active${gwLabel} • Refresh in ${formatted}`;
    }
  }

  // --- Perform Login Routine ---
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
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
          triggerButtonClick(loginButton);
          console.log("[RVCE Auto-Login] Sign In button activated:", loginButton);
        }, 300);
      } else {
        // Fallback: If no explicit button located, try form submit
        const form = usernameField.closest("form");
        if (form) {
          if (onSuccess) onSuccess();
          setTimeout(() => {
            console.log("[RVCE Auto-Login] Triggering form submit fallback.");
            try {
              form.requestSubmit();
            } catch (e) {
              form.submit();
            }
          }, 300);
        } else {
          if (onFail) onFail("Sign In button could not be located on the page.");
        }
      }
    } else {
      if (onFail) onFail("Login input fields could not be found.");
    }
  }

  // --- Main State Machine Controller ---
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
  function runStateMachine() {
    // Clean up any lingering top banner from previous states if page is active
    if (isKeepalivePage()) {
      const oldBanner = document.getElementById("rvce-auto-banner");
      if (oldBanner) oldBanner.remove();
    }

    // STATE 4: LOGOUT RECOVERY
    if (isLogoutPage()) {
      console.log("[RVCE State Machine] State: LOGOUT_RECOVERY - Session logged out.");

      let attempts = 0;
      const banner = injectTopBanner("🔄 Session logged out. Reconnecting to RVCE WiFi...", "#28a745", "pointer");

      const endpoints = [
        "http://1.1.1.1",
        "http://connectivitycheck.gstatic.com/generate_204",
        "http://1.0.0.1",
        "http://www.msftconnecttest.com/redirect"
      ];

      const attemptRecovery = () => {
        attempts++;
        console.log(`[RVCE State Machine] Recovery attempt #${attempts}. Cancelling hanging requests...`);

        try {
          window.stop();
        } catch (e) {
          console.log("[RVCE State Machine] window.stop failed:", e);
        }

        banner.textContent = attempts > 1
          ? `🔄 Reconnecting to RVCE WiFi (Retrying #${attempts})... Click to force retry`
          : "🔄 Session logged out. Reconnecting to RVCE WiFi...";

        const targetUrl = endpoints[(attempts - 1) % endpoints.length];

        setTimeout(() => {
          try {
            window.location.replace(targetUrl);
          } catch (e) {
            window.location.href = targetUrl;
          }
        }, 50);
      };

      banner.addEventListener("click", attemptRecovery);
      setTimeout(attemptRecovery, 400);

      const watchdogTimer = setInterval(() => {
        if (isLogoutPage()) {
          console.log("[RVCE State Machine] Stuck on logout page. Retrying recovery...");
          attemptRecovery();
        } else {
          clearInterval(watchdogTimer);
        }
      }, 3000);

      return;
    }

    // STATE 2: SESSION ACTIVE (Keepalive Page / Sophos Logged-in / Fortinet Keepalive)
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    if (isKeepalivePage()) {
      console.log("[RVCE State Machine] State: SESSION_ACTIVE");

      // Clean up login banner if still present
      const loginBanner = document.getElementById("rvce-auto-banner");
      if (loginBanner) loginBanner.remove();

      // Mark session as armed across page reloads and storage
      sessionStorage.setItem("rvce_session_armed", "true");
      chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

      // Detect portal type
      const isSophos = window.location.href.includes("httpclient.html") || !!document.getElementById("donotclosepage");
      const gatewayLabel = isSophos ? "Sophos" : "Fortinet";

      // On Sophos: Neutralize window.onbeforeunload logout beacon to prevent accidental session termination
      if (isSophos) {
        try {
          window.onbeforeunload = null;
          console.log("[RVCE Auto-Login] Neutralized Sophos onbeforeunload logout hook.");
        } catch (e) {}
      }

      // Load user configured refresh interval (default 5 min)
      chrome.storage.local.get(["refreshInterval", "username"], (result) => {
        const intervalMinutes = (result.refreshInterval && result.refreshInterval >= 1) ? result.refreshInterval : 5;
        let remainingSeconds = intervalMinutes * 60;

        const performRefresh = () => {
          if (isSophos) {
            // Sophos Keepalive: Ping live keepalive endpoint directly to refresh server lease
            console.log("[RVCE Auto-Login] Refreshing Sophos live session ping...");
            const username = result.username || document.getElementById("username")?.value || "";
            const pingUrl = `/live?mode=192&username=${encodeURIComponent(username.toLowerCase())}&a=${Date.now()}`;
            fetch(pingUrl, { method: "GET" })
              .then((res) => res.text())
              .then((respText) => {
                console.log("[RVCE Auto-Login] Sophos keepalive ACK received:", respText.substring(0, 100));
                remainingSeconds = intervalMinutes * 60;
                injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);
              })
              .catch((err) => {
                console.log("[RVCE Auto-Login] Sophos ping notice:", err);
                remainingSeconds = intervalMinutes * 60;
              });
          } else {
            // Fortinet Keepalive: Standard page reload resets lease
            console.log("[RVCE Auto-Login] Reloading Fortinet keepalive page...");
            window.location.reload();
          }
        };

        injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);

        const countdownInterval = setInterval(() => {
          remainingSeconds--;
          if (remainingSeconds <= 0) {
            remainingSeconds = intervalMinutes * 60;
            performRefresh();
          } else {
            injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);
          }
        }, 1000);

        // Continuous Session Watchdog:
        // Detects if the session drops on the client (e.g., Sophos flips back to 'loggedout')
        // Automatically transitions to State 3 without requiring user intervention!
        const sessionDropWatcher = setInterval(() => {
          if (!isKeepalivePage()) {
            console.log("[RVCE State Machine] Session drop detected! Transitioning to Auto-Reconnect...");
            clearInterval(countdownInterval);
            clearInterval(sessionDropWatcher);
            const badge = document.getElementById("rvce-keepalive-badge");
            if (badge) badge.remove();
            runStateMachine();
          }
        }, 2000);
      });

      return;
    }

    // STATE 1 & STATE 3: LOGIN PAGE
    // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
    if (isLoginPage()) {
      // Check for authentication failure errors
      if (hasAuthError()) {
        console.log("[RVCE State Machine] Authentication failure detected. Disarming auto-login to prevent loop.");
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

        // Always show the green "Auto-Continue" button
        const banner = injectTopBanner("Auto-Continue", "#28a745", "pointer");

        banner.addEventListener("mouseenter", () => {
          banner.style.backgroundColor = "#218838";
        });
        banner.addEventListener("mouseleave", () => {
          banner.style.backgroundColor = "#28a745";
        });

        const executeLogin = () => {
          banner.textContent = "Connecting...";
          banner.style.backgroundColor = "#16a34a";

          // Arm the session
          sessionStorage.setItem("rvce_session_armed", "true");
          chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

          performLogin(
            storageData,
            () => {
              banner.textContent = "Connecting to RVCE WiFi...";
            },
            (errMessage) => {
              alert(errMessage);
              banner.textContent = "Auto-Continue";
              banner.style.backgroundColor = "#28a745";
              sessionStorage.removeItem("rvce_session_armed");
              chrome.storage.local.set({ sessionArmed: false });
            }
          );
        };

        banner.addEventListener("click", executeLogin);

        if (isArmed) {
          // STATE 3: AUTO_RECONNECT
          // Green button appears, then automatically presses after 700ms to allow DOM to settle
          console.log("[RVCE State Machine] State: AUTO_RECONNECT (Session armed). Auto-pressing Auto-Continue button in 700ms.");
          setTimeout(() => {
            executeLogin();
          }, 700);
        } else {
          // STATE 1: COLD_START_LOGIN
          console.log("[RVCE State Machine] State: COLD_START_LOGIN. Waiting for single manual user click.");
        }
      });

      return;
    }

    console.log("[RVCE State Machine] Page is neither active session, login, nor logout.");
  }

  // Run on DOM ready
  // Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runStateMachine);
  } else {
    runStateMachine();
  }
})();
