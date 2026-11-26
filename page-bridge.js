// RVCE WiFi Auto-Login Page Bridge (Main World Context) (v2.4.0)
// Created by Mr. Shashanka Jois, CSE student at RVCE(batch 2027). email: shasedujois@gmail.com LinkedIn: https://www.linkedin.com/in/shashanka-jois-chessmate/

(function () {
  "use strict";

  // Idempotency guard: prevent duplicate listeners if loaded via both manifest MAIN world and DOM bridge
  if (window.__rvcePageBridgeInitialized) {
    return;
  }
  window.__rvcePageBridgeInitialized = true;
  try {
    if (document.documentElement) {
      document.documentElement.dataset.rvceBridgeReady = "1";
    }
  } catch (e) {}

  console.log("[RVCE Page Bridge v2.4.0] Initialized in page main world context.");

  // Cleanly neutralize Sophos onbeforeunload logout beacon in main world
  try {
    window.onbeforeunload = null;
  } catch (e) {}

  // Handle Login Event from isolated content script
  window.addEventListener("RVCE_TRIGGER_LOGIN", function () {
    console.log("[RVCE Page Bridge] Received RVCE_TRIGGER_LOGIN event.");

    // 1. Sophos Native Method
    try {
      if (typeof submitRequest === "function") {
        console.log("[RVCE Page Bridge] Invoking native Sophos submitRequest()...");
        submitRequest();
        return;
      }
    } catch (err) {
      console.log("[RVCE Page Bridge] submitRequest call error:", err);
    }

    // 2. Generic Portal Fallback (standard buttons / form submit)
    try {
      const submitBtn = document.querySelector(
        "button[type='submit'], input[type='submit'], #submit, #loginbutton, .button"
      );
      if (submitBtn && submitBtn.tagName !== "A") {
        submitBtn.click();
        return;
      }
      const form = document.querySelector("form");
      if (form) {
        form.submit();
      }
    } catch (e) {
      console.log("[RVCE Page Bridge] Submit fallback notice:", e);
    }
  });

  // Handle Keepalive Refresh Event from isolated content script
  window.addEventListener("RVCE_TRIGGER_REFRESH", function () {
    console.log("[RVCE Page Bridge] Received RVCE_TRIGGER_REFRESH event.");
    try {
      if (typeof sendLiveRequest === "function") {
        console.log("[RVCE Page Bridge] Invoking native Sophos sendLiveRequest()...");
        sendLiveRequest();
        window.dispatchEvent(new CustomEvent("RVCE_LIVE_REFRESH_OK"));
        return;
      }
    } catch (e) {}

    try {
      window.location.reload();
    } catch (e) {}
  });
})();
