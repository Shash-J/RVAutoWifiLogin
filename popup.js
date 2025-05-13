// Load saved toggle state
document.addEventListener("DOMContentLoaded", function () {
    const saveButton = document.getElementById("save");
    
    saveButton.addEventListener("click", function () {
        let username = document.getElementById("username").value;
        let password = document.getElementById("password").value;

        chrome.storage.local.set({ username, password }, function () {
            alert("Credentials saved successfully!");
        });
    });
});

  
  // Save toggle state
  document.getElementById('toggleAutoFill').addEventListener('change', (e) => {
    chrome.storage.local.set({ autoFillEnabled: e.target.checked });
  });

  