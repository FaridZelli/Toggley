document.addEventListener("DOMContentLoaded", () => {
  const lightInput = document.getElementById("lightTime");
  const darkInput = document.getElementById("darkTime");
  const saveBtn = document.getElementById("saveBtn");
  const saveMsg = document.getElementById("saveMsg");
  const errorMsg = document.getElementById("errorMsg");

  // Load existing schedule
  browser.storage.local.get("themeSchedule").then(result => {
    const schedule = result.themeSchedule || {};
    lightInput.value = schedule.light || "06:00";
    darkInput.value = schedule.dark || "18:00";
  });

  // Save new schedule
  saveBtn.addEventListener("click", () => {
    const lightTime = lightInput.value;
    const darkTime = darkInput.value;

    // Clear previous messages
    [errorMsg, saveMsg].forEach(el => {
      el.textContent = "";
      el.style.display = "none";
    });
    saveMsg.className = "";

    if (!lightTime || !darkTime) {
      errorMsg.textContent = "Please select both light and dark theme times.";
      errorMsg.style.display = "block";
      return;
    }

    if (lightTime === darkTime) {
      errorMsg.textContent = "Light and dark times cannot be the same.";
      errorMsg.style.display = "block";
      return;
    }

    browser.storage.local.set({
      themeSchedule: {
        light: lightTime,
        dark: darkTime
      }
    }).then(() => {
      saveMsg.textContent = "Settings saved successfully!";
      saveMsg.className = "success";
      saveMsg.style.display = "block";
      setTimeout(() => {
        saveMsg.style.display = "none";
      }, 2000);
    }).catch(() => {
      saveMsg.textContent = "Failed to save settings.";
      saveMsg.className = "fail";
      saveMsg.style.display = "block";
    });
  });
});