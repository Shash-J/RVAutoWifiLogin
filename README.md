# RVAutoWifiLogin

A Chrome extension that adds an `Auto-Continue` button to the RV Institutions login page and saves WiFi credentials so users only need to enter them once.

## Features

- Save WiFi username and password once in the extension popup
- Load saved credentials automatically on next use
- Autofill the login form and submit the page when `Auto-Continue` is pressed
- Clear saved credentials with a single button

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `RVAutoWifiLogin` folder

## Usage

1. Click the extension icon to open the popup
2. Enter your WiFi username and password
3. Click `Save credentials`
4. Visit the RV Institutions login page (e.g. `https://172.16.0.2:1003`)
5. Click the `Auto-Continue` button added to the page

## Clearing Credentials

- Use the `Clear saved credentials` button in the popup to remove stored username and password.

## Files

- `manifest.json` - extension manifest and permissions
- `popup/popup.html` - extension popup UI
- `popup/popup.js` - popup save/load/clear logic
- `content-script.js` - injects auto-fill button and performs login

## Notes

- Credentials are stored locally using Chrome extension storage.
- This extension is designed for the RV Institutions WiFi login page.
