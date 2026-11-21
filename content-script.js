/**
 * RVCE WiFi Auto-Login State Machine Engine (v2.3.1)
 * 
 * Multi-Gateway Reactive Engine:
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

  console.log("[RVCE Auto-Login Engine v2.3.1] Initializing on:", window.location.href);

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
   * Multi-tier algorithm prioritizing Sophos, Fortinet, and custom portals.
   * Strictly excludes "Sign out" / "Logout" buttons.
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

      // Reject logout / cancel buttons
      if (/sign[\s-]?out|log[\s-]?out|disconnect|cancel/i.test(text)) {
        return false;
      }

      if (/sign[\s-]?in|sign-in|log[\s-]?in|log-in|submit|continue|connect|authenticate|credential login|proceed|access internet/i.test(text)) {
        return true;
      }

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

  /**
   * Universal Submit Trigger
   * Bypasses Chrome isolated-world restrictions on programmatic javascript: URL clicks
   * by directly injecting script execution into the page's MAIN JavaScript context.
   */
  function triggerUniversalSubmit(loginButton) {
    console.log("[RVCE Auto-Login] Triggering universal submission...");

    // 1. Direct Script Injection in Page DOM (executes in page's MAIN context)
    const scriptContent = `
      (function() {
        try {
          if (typeof submitRequest === 'function') {
            console.log('[RVCE Auto-Login] Invoked native submitRequest()');
            submitRequest();
            return;
          }
          const a = document.querySelector('a[href*="submitRequest"]');
          if (a) {
            const href = a.getAttribute('href') || '';
            if (href.startsWith('javascript:')) {
              eval(href.substring(11));
              return;
            }
          }
          const btn = document.getElementById('loginbutton') ||
                      document.querySelector('button[type="submit"], input[type="submit"], [role="button"]');
          if (btn) btn.click();
        } catch(e) {
          console.log('[RVCE Auto-Login] Native submit exception:', e);
        }
      })();
    `;

    try {
      const scriptEl = document.createElement("script");
      scriptEl.textContent = scriptContent;
      (document.head || document.documentElement).appendChild(scriptEl);
      scriptEl.remove();
    } catch (e) {
      console.log("[RVCE Auto-Login] DOM script injection notice:", e);
    }

    // 2. Background Service Worker MAIN world execution (Manifest V3 scripting API)
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "executeInMainWorld" }, (res) => {
          console.log("[RVCE Auto-Login] Background main world execution ACK:", res);
        });
      }
    } catch (e) {}

    // 3. Fallback programmatic clicks & mouse event dispatches
    if (loginButton) {
      try {
        loginButton.focus();
      } catch (e) {}

      loginButton.click();

      const parentLink = loginButton.closest("a");
      if (parentLink && parentLink !== loginButton) {
        try {
          parentLink.click();
        } catch (e) {}
      }

      try {
        loginButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        loginButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        loginButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      } catch (e) {}
    }

    // 4. Form submit fallback
    const userField = findUsernameField();
    const form = (loginButton ? loginButton.closest("form") : null) || (userField ? userField.closest("form") : null);
    if (form) {
      try {
        form.requestSubmit();
      } catch (e) {
        try {
          form.submit();
        } catch (err) {}
      }
    }
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
    if (isKeepalivePage()) return false;
    if (isLogoutPage()) return false;

    const userField = findUsernameField();
    const passField = findPasswordField();
    if (!userField || !passField) return false;

    const credsContainer = document.getElementById("credentials");
    if (credsContainer && credsContainer.classList.contains("loggedin")) {
      return false;
    }

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
    let banner = document.getElementById("rvce-auto-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "rvce-auto-banner";
      document.body.prepend(banner);
    }

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

    return banner;
  }

  function removeTopBanner() {
    const banner = document.getElementById("rvce-auto-banner");
    if (banner) banner.remove();
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

  function removeKeepaliveBadge() {
    const badge = document.getElementById("rvce-keepalive-badge");
    if (badge) badge.remove();
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

      if (onSuccess) onSuccess();

      // Short delay for DOM field binding, then trigger universal submission
      setTimeout(() => {
        triggerUniversalSubmit(loginButton);
      }, 350);
    } else {
      if (onFail) onFail("Login input fields could not be found.");
    }
  }

  // --- Reactive State Machine Handlers ---
  let activeCountdownInterval = null;
  let activeConnectingTimeout = null;

  function handleLogoutRecovery() {
    console.log("[RVCE State Machine] Entering State: LOGOUT_RECOVERY");
    removeKeepaliveBadge();

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
  }

  function handleSessionActive() {
    console.log("[RVCE State Machine] Entering State: SESSION_ACTIVE");

    // Clean up login banner & timers
    removeTopBanner();
    if (activeConnectingTimeout) {
      clearTimeout(activeConnectingTimeout);
      activeConnectingTimeout = null;
    }

    sessionStorage.setItem("rvce_session_armed", "true");
    chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

    const isSophos = window.location.href.includes("httpclient.html") || !!document.getElementById("donotclosepage");
    const gatewayLabel = isSophos ? "Sophos" : "Fortinet";

    // Neutralize Sophos onbeforeunload logout beacon
    if (isSophos) {
      try {
        window.onbeforeunload = null;
        const script = document.createElement("script");
        script.textContent = "window.onbeforeunload = null;";
        (document.head || document.documentElement).appendChild(script);
        script.remove();
        console.log("[RVCE Auto-Login] Neutralized Sophos onbeforeunload.");
      } catch (e) {}
    }

    chrome.storage.local.get(["refreshInterval", "username"], (result) => {
      const intervalMinutes = (result.refreshInterval && result.refreshInterval >= 1) ? result.refreshInterval : 5;
      let remainingSeconds = intervalMinutes * 60;

      const performRefresh = () => {
        if (isSophos) {
          console.log("[RVCE Auto-Login] Refreshing Sophos live session ping...");
          const username = result.username || document.getElementById("username")?.value || "";
          const pingUrl = `/live?mode=192&username=${encodeURIComponent(username.toLowerCase())}&a=${Date.now()}`;
          fetch(pingUrl, { method: "GET" })
            .then((res) => res.text())
            .then((respText) => {
              console.log("[RVCE Auto-Login] Sophos keepalive response:", respText.substring(0, 100));
              remainingSeconds = intervalMinutes * 60;
              injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);
            })
            .catch((err) => {
              console.log("[RVCE Auto-Login] Sophos ping notice:", err);
              remainingSeconds = intervalMinutes * 60;
            });
        } else {
          console.log("[RVCE Auto-Login] Reloading Fortinet keepalive page...");
          window.location.reload();
        }
      };

      injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);

      if (activeCountdownInterval) clearInterval(activeCountdownInterval);
      activeCountdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          remainingSeconds = intervalMinutes * 60;
          performRefresh();
        } else {
          injectKeepaliveBadge(remainingSeconds, performRefresh, gatewayLabel);
        }
      }, 1000);
    });
  }

  function handleLoginPage() {
    console.log("[RVCE State Machine] Entering State: LOGIN_PAGE");
    removeKeepaliveBadge();
    if (activeCountdownInterval) {
      clearInterval(activeCountdownInterval);
      activeCountdownInterval = null;
    }

    if (hasAuthError()) {
      console.log("[RVCE State Machine] Auth failure detected. Disarming auto-login.");
      sessionStorage.removeItem("rvce_session_armed");
      chrome.storage.local.set({ sessionArmed: false });
      injectTopBanner("❌ Authentication Failed: Please check your credentials in the extension popup.", "#dc2626", "default");
      return;
    }

    chrome.storage.local.get(["username", "password", "sessionArmed", "lastKeepalive"], (storageData) => {
      const sessionArmedLocal = sessionStorage.getItem("rvce_session_armed") === "true";
      const storageArmed = storageData.sessionArmed === true && (Date.now() - (storageData.lastKeepalive || 0) < 12 * 3600 * 1000);
      const isArmed = sessionArmedLocal || storageArmed;

      const banner = injectTopBanner("Auto-Continue", "#28a745", "pointer");

      banner.addEventListener("mouseenter", () => {
        if (banner.textContent === "Auto-Continue") banner.style.backgroundColor = "#218838";
      });
      banner.addEventListener("mouseleave", () => {
        if (banner.textContent === "Auto-Continue") banner.style.backgroundColor = "#28a745";
      });

      const executeLogin = () => {
        banner.textContent = "Connecting to RVCE WiFi...";
        banner.style.backgroundColor = "#16a34a";

        sessionStorage.setItem("rvce_session_armed", "true");
        chrome.storage.local.set({ sessionArmed: true, lastKeepalive: Date.now() });

        // Safeguard watchdog: If page remains on login after 8 seconds, provide instant retry
        if (activeConnectingTimeout) clearTimeout(activeConnectingTimeout);
        activeConnectingTimeout = setTimeout(() => {
          if (isLoginPage()) {
            console.log("[RVCE Auto-Login] Connection taking longer than expected. Enabling retry.");
            banner.textContent = "⚠️ Still Connecting... Click to Retry";
            banner.style.backgroundColor = "#d97706";
          }
        }, 8000);

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
        console.log("[RVCE State Machine] State: AUTO_RECONNECT (Session armed). Auto-pressing Auto-Continue in 600ms.");
        setTimeout(executeLogin, 600);
      } else {
        console.log("[RVCE State Machine] State: COLD_START_LOGIN. Waiting for single user click.");
      }
    });
  }

  // --- Live Reactive State Machine Controller ---
  let currentState = null; // "LOGIN", "ACTIVE", "LOGOUT"
  let debouncedStateCheck = null;

  function runReactiveStateMachine() {
    if (isKeepalivePage()) {
      if (currentState !== "ACTIVE") {
        currentState = "ACTIVE";
        handleSessionActive();
      }
    } else if (isLogoutPage()) {
      if (currentState !== "LOGOUT") {
        currentState = "LOGOUT";
        handleLogoutRecovery();
      }
    } else if (isLoginPage()) {
      if (currentState !== "LOGIN") {
        currentState = "LOGIN";
        handleLoginPage();
      }
    }
  }

  function scheduleStateCheck() {
    if (debouncedStateCheck) clearTimeout(debouncedStateCheck);
    debouncedStateCheck = setTimeout(runReactiveStateMachine, 120);
  }

  // Observe DOM mutations to reactively catch AJAX state transitions (e.g. Sophos single-page login)
  const domObserver = new MutationObserver(() => {
    scheduleStateCheck();
  });

  function startEngine() {
    runReactiveStateMachine();

    if (document.body) {
      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    }

    // Safety polling interval every 1.5s
    setInterval(runReactiveStateMachine, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startEngine);
  } else {
    startEngine();
  }
})();
