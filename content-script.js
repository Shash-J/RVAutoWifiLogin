if (window.location.href.startsWith("https://172.16.0.2:1003")) {
  console.log("WiFi Auto-Login script activated.");

  function findUsernameField() {
    return document.querySelector(
      'input[name="username"], input[name="user"], input[name="auth_user"], input[placeholder*="Username"], input[type="text"], input[type="email"]'
    );
  }

  function findPasswordField() {
    return document.querySelector(
      'input[name="password"], input[name="pass"], input[placeholder*="Password"], input[type="password"]'
    );
  }

  function findLoginButton() {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    return buttons.find((el) => {
      const text = (el.innerText || el.value || "").toLowerCase();
      return /sign in|sign-in|login|continue|submit|connect/.test(text);
    }) || document.querySelector('button[type="submit"], input[type="submit"]');
  }

  function createAutoFillButton() {
      let button = document.createElement("button");
      button.innerText = "Auto-Continue";
      button.id = "wifi-auto-fill";
      button.style.position = "absolute";
      button.style.top = "20px";
      button.style.right = "20px";
      button.style.zIndex = "1000";
      button.style.padding = "10px";
      button.style.backgroundColor = "#28a745";
      button.style.color = "white";
      button.style.border = "none";
      button.style.cursor = "pointer";

      document.body.appendChild(button);

      button.addEventListener("click", function () {
          chrome.storage.local.get(["username", "password"], function (data) {
              if (data.username && data.password) {
                  let usernameField = findUsernameField();
                  let passwordField = findPasswordField();
                  let loginButton = findLoginButton();

                  if (usernameField && passwordField) {
                      usernameField.value = data.username;
                      passwordField.value = data.password;
                      console.log("Credentials autofilled.");

                      if (loginButton) {
                          loginButton.click();
                          console.log("Login button clicked.");
                      } else {
                          console.log("Login button not found.");
                      }
                  } else {
                      alert("Could not find the login fields on this page. Please check the page layout.");
                  }
              } else {
                  alert("No credentials saved. Please enter them once in the extension popup.");
              }
          });
      });
  }

  createAutoFillButton();
}
