# Privacy Policy for RVCE WiFi Auto-Login

**Last Updated**: September 2026  
**Extension Name**: RVCE WiFi Auto-Login  
**Developer**: Shashanka Jois  

## 1. Overview
The **RVCE WiFi Auto-Login** Chrome Extension is an open-source tool built to simplify and automate campus Wi-Fi captive portal authentication for students and faculty at RV College of Engineering (RVCE), Bengaluru.

Your privacy is our top priority. This extension is designed with a **privacy-first, zero-telemetry** architecture.

---

## 2. Information We Handle
The extension handles only the minimum data required to perform its single purpose:

- **Wi-Fi Username**: Entered manually by the user in the popup.
- **Wi-Fi Password**: Entered manually by the user in the popup.
- **Keepalive Refresh Interval**: User-selected preference (default: 5 minutes).

---

## 3. How Your Data Is Stored & Used
- **100% Local Storage**: All credentials and settings are stored locally on your device using Chrome's official [`chrome.storage.local`](https://developer.chrome.com/docs/extensions/reference/storage/) API.
- **No External Servers**: The extension has **no backend servers, no analytics, no tracking, and no external API connections**.
- **Scoped Usage**: Credentials are used solely to populate the authentication form on the RVCE Fortinet captive portal (`https://172.16.0.2:1003/*`).

---

## 4. Third-Party Sharing
We do **NOT** sell, rent, trade, share, or transmit your personal data or credentials to any third party under any circumstances.

---

## 5. Data Retention & Deletion
- Your credentials remain stored locally on your machine for as long as you use the extension.
- You can delete your saved credentials at any time by:
  1. Clicking the extension icon in the toolbar.
  2. Clicking the **"Clear Saved Credentials"** button.
  3. Or simply uninstalling the extension from `chrome://extensions`.

---

## 6. Open Source Transparency
The full source code of this extension is publicly accessible on GitHub for auditing, inspection, and verification by any student, faculty member, or security researcher.

---

## 7. Contact
If you have any questions, feedback, or concerns regarding this privacy policy:
- Open an issue on GitHub: [RVAutoWifiLogin Repository](https://github.com/Shash-J/RVAutoWifiLogin)
