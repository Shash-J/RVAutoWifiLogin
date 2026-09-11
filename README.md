# RVCE WiFi Auto-Login Engine (v2.0)

An open-source Chrome Extension designed for RV College of Engineering (RVCE) students and faculty. It automates authentication on the campus Fortinet captive portal (`https://172.16.0.2:1003`), runs a background keepalive refresh loop, and autonomously reconnects when sessions expire.

---

## 🎯 The Core Problem & Solution

At RVCE, campus Wi-Fi sessions expire periodically (typically every ~37 minutes via Fortinet's lease cycle), requiring users to repeatedly re-enter credentials or manually click through portal tabs. 

**The RVCE Auto-Login Engine** solves this completely:
1. When you first open your laptop and connect to Wi-Fi, you only need to click **"Auto-Continue"** once.
2. The engine keeps your session active by automatically refreshing the keepalive page every **5 minutes** (configurable), continually resetting Fortinet's countdown timer.
3. If the network blips, times out, or redirects back to the login page, the engine **autonomously logs you back in with zero clicks required**.
4. If a logout confirmation page appears, it immediately redirects and restores your session.

---

## 🔄 State Machine Architecture

The extension operates on a 4-state finite state machine (FSM):

```mermaid
stateDiagram-v2
    [*] --> ColdStart : Laptop opened / Connect to WiFi

    state "State 1: Cold Start (Manual Prompt)" as ColdStart {
        [*] --> IdleLoginPage : Load 172.16.0.2:1003/login
        IdleLoginPage --> SubmittingManual : User clicks "Auto-Continue"
        SubmittingManual : 1. Set sessionArmed = true
        SubmittingManual : 2. Fill credentials & dispatch input events
        SubmittingManual : 3. Click "Sign In"
    }

    state "State 2: Session Active (Keepalive Loop)" as KeepaliveLoop {
        SubmittingManual --> KeepaliveMonitor : Auth Success (Redirect to /keepalive)
        KeepaliveMonitor : 1. Display status badge "Auto-Refresh in Xs"
        KeepaliveMonitor : 2. Run 5-minute countdown (configurable)
        KeepaliveMonitor --> PageReload : Timer expires
        PageReload --> KeepaliveMonitor : Page reloads & Fortinet timer resets
    }

    state "State 3: Auto-Reconnect (Zero-Click Recovery)" as AutoReconnect {
        PageReload --> AutoLoginPage : Reload lands on /login (Session Expired)
        AutoLoginPage : Detected sessionArmed == true
        AutoLoginPage --> AutoSubmitting : Auto-trigger "Auto-Continue" (600ms delay)
        AutoSubmitting : Autofill credentials & trigger Sign In
        AutoSubmitting --> KeepaliveMonitor : Login Success
    }

    state "State 4: Logout Recovery" as LogoutRecovery {
        KeepaliveMonitor --> LoggedOutPage : Server drops session / Logout page
        LoggedOutPage : Detects "successfully log out"
        LoggedOutPage --> AutoLoginPage : Immediate redirect to /login
    }

    KeepaliveMonitor --> UserDisarmed : User clicks "Terminate Session" / Clears credentials
    UserDisarmed --> ColdStart : sessionArmed set to false
```

### Detailed State Breakdown

| State | Trigger & Conditions | Actions & Behavior | Next Transition |
| :--- | :--- | :--- | :--- |
| **1. Cold Start Login** | First visit to login portal after opening laptop (`sessionArmed = false`). | Injects the top green banner: **`Auto-Continue`**. Waits for user click. | On click $\rightarrow$ Arms session, fills credentials, clicks Sign In $\rightarrow$ **State 2**. |
| **2. Session Active** | Browser lands on `/keepalive` with active session. | Injects a floating status pill (`🛡️ RVCE Keepalive Active • Refresh in 4:59`). Runs countdown. | When timer expires $\rightarrow$ reloads page to reset Fortinet lease $\rightarrow$ **State 2** (or **State 3** if dropped). |
| **3. Auto-Reconnect** | Page lands on portal login while `sessionArmed = true`. | Displays the green **`Auto-Continue`** banner, then automatically presses it after 700ms (zero-click). | On success $\rightarrow$ **State 2**. On auth failure $\rightarrow$ Disarms to prevent loops. |
| **4. Logout Recovery** | Page displays `"successfully log out"` or `/logout`. | Detects session termination. Displays redirection banner and triggers captive portal gateway reload to restore login page. | Lands on portal login $\rightarrow$ **State 3** (Auto-Reconnect). |

---

## ✨ Features

- **One-Click Initial Setup**: Enter your username and WiFi password once in the extension popup.
- **Configurable Keepalive Refresh**: Default refresh interval is set to **5 minutes** (recommended to comfortably beat Fortinet's ~37 min lease cycle). You can adjust this to any interval between 1 and 30 minutes in the popup.
- **Zero-Click Autonomous Reconnection**: Once armed during your session, any network timeout or dropped session is automatically recovered without disturbing your workflow. The green button appears and is automatically pressed.
- **Visual Feedback**:
  - **Top Banner**: Clear visual indication during connection and reconnection.
  - **Keepalive Pill**: Shows exact countdown until next refresh, with a quick `[↻ Refresh]` button for instant manual refresh.
- **Auth Error Safeguard**: Disarms automatically if an incorrect password error is detected, avoiding infinite submit loops.

---

## 🚀 Installation Guide

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Shash-J/RVAutoWifiLogin.git
   ```
2. Open Google Chrome (or Chromium-based browsers like Brave, Edge, Opera).
3. Navigate to `chrome://extensions/` in your address bar.
4. Toggle **Developer mode** in the top-right corner.
5. Click **Load unpacked** in the top-left corner.
6. Select the `RVAutoWifiLogin` folder.

---

## 🛠️ How to Use

1. Click the **RVCE WiFi Auto-Login** icon in your browser toolbar.
2. Enter your campus Wi-Fi credentials:
   - **Username**: Your campus Wi-Fi username
   - **Password**: Your campus Wi-Fi password
   - **Keepalive Refresh Interval**: `5` minutes (default)
3. Click **Save Settings**.
4. Connect to the RVCE Wi-Fi network.
5. When the captive portal opens (`https://172.16.0.2:1003`), click the green **Auto-Continue** bar at the top once.
6. Keep the keepalive tab open (or pin it). Enjoy uninterrupted internet throughout your day!

---

## 🔒 Security & Privacy Notice

- **100% Local Storage**: All credentials and settings are saved exclusively inside your local browser's `chrome.storage.local`.
- **Zero Remote Transmission**: No data, credentials, or telemetry ever leave your machine.
- **Scoped Permissions**: The extension only runs on the official RVCE portal domain (`*://172.16.0.2:1003/*`).

---

## 📂 Project Structure

```
RVAutoWifiLogin/
├── icons/
│   └── icon-48.png       # Extension toolbar icon
├── popup/
│   ├── popup.html        # Settings modal interface
│   └── popup.js          # Credential & interval configuration logic
├── background.js         # Service worker initializing default settings
├── content-script.js     # State machine controller & UI injection
├── manifest.json         # Manifest V3 extension configuration
└── README.md             # Project documentation
```

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports from fellow RVCE students are welcome! Feel free to open an issue or submit a pull request.

