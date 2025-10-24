const statusElement = document.getElementById("status");
const lightSelect = document.getElementById("lightTheme");
const darkSelect = document.getElementById("darkTheme");
const saveButton = document.getElementById("save");

let persistentErrorShown = false;

function showStatus(message, type = "success", persistent = false, duration = 2000) {
	if (persistent && persistentErrorShown) return;
	statusElement.textContent = message;
	statusElement.className = type;
	statusElement.style.display = "block";

	if (!persistent) {
		setTimeout(() => {
			statusElement.style.display = "none";
		}, duration);
	} else {
		persistentErrorShown = true;
	}
}

function hideStatus() {
	statusElement.style.display = "none";
	persistentErrorShown = false;
}

// Disable save button if themes are the same
function validateSelections() {
	if (lightSelect.value === darkSelect.value) {
		saveButton.disabled = true;
		showStatus("ⓘ Light and dark themes must be different", "error", true);
	} else {
		saveButton.disabled = false;
		hideStatus(); // Hide error once selections are valid
	}
}

lightSelect.addEventListener("change", validateSelections);
darkSelect.addEventListener("change", validateSelections);

async function loadThemes() {
	const themes = (await browser.management.getAll()).filter(ext => ext.type === "theme");
	const { lightTheme, darkTheme } = await browser.storage.sync.get({
		lightTheme: "firefox-compact-light@mozilla.org",
		darkTheme: "firefox-compact-dark@mozilla.org"
	});

	for (const theme of themes) {
		const option = document.createElement("option");
		option.value = theme.id;
		option.textContent = theme.name;

		const option2 = option.cloneNode(true);
		lightSelect.appendChild(option);
		darkSelect.appendChild(option2);
	}

	lightSelect.value = lightTheme;
	darkSelect.value = darkTheme;

	validateSelections();
}

async function saveOptions() {
	const lightTheme = lightSelect.value;
	const darkTheme = darkSelect.value;

	const { lastUsed = "light" } = await browser.storage.sync.get("lastUsed");
	await browser.storage.sync.set({ lightTheme, darkTheme });

	const themeToActivate = lastUsed === "dark" ? darkTheme : lightTheme;
	await browser.management.setEnabled(themeToActivate, true);

	showStatus("Saved", "success");
}

saveButton.addEventListener("click", saveOptions);
loadThemes();
