if (window.location.href.startsWith("https://172.16.0.2:1003")) {
  console.log("WiFi Auto-Login script activated.");

  // Function to create "Auto-Fill" button
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

      // Event listener for Auto-Fill button
      button.addEventListener("click", function () {
          chrome.storage.local.get(["username", "password"], function (data) {
              if (data.username && data.password) {
                  let usernameField = document.querySelector('input[name="username"]');
                  let passwordField = document.querySelector('input[name="password"]');
                  let loginButton = document.querySelector('button[type="submit"]');

                  if (usernameField && passwordField) {
                      usernameField.value = data.username;
                      passwordField.value = data.password;
                      console.log("Credentials autofilled.");

                      // Click the "Continue" button automatically
                      if (loginButton) {
                          loginButton.click();
                          console.log("Login button clicked.");
                      } else {
                          console.log("Login button not found.");
                      }
                  } else {
                      console.log("Username or Password field not found.");
                  }
              } else {
                  alert("No credentials saved. Please enter them in the extension popup.");
              }
          });
      });
  }

  // Run the function to create button
  createAutoFillButton();
}
