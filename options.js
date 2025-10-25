const statusElement = document.getElementById("status");
const lightSelect = document.getElementById("lightTheme");
const darkSelect = document.getElementById("darkTheme");
const saveButton = document.getElementById("save");
const lightColorOverrideCheckbox = document.getElementById("lightColorOverride");
const darkColorOverrideCheckbox = document.getElementById("darkColorOverride");
const lightColorContainer = document.getElementById("lightColorContainer");
const darkColorContainer = document.getElementById("darkColorContainer");
const lightColorInput = document.getElementById("lightColor");
const darkColorInput = document.getElementById("darkColor");
const restoreButton = document.getElementById("restore");

// This is embarrasing, will cleanup later

let persistentErrorShown = false;

function showStatus(message, type = "error") {
	// Remove old dynamic status boxes
	document.querySelectorAll(".dynamic-status").forEach(el => el.remove());

	// Normalize message input
	const messages = Array.isArray(message) ? message : [message];

	messages.forEach(msg => {
		const div = document.createElement("div");
		div.className = type + " dynamic-status";
		div.innerHTML = msg;
		div.style.marginTop = "8px";
		div.style.padding = "8px";
		div.style.borderRadius = "4px";
		div.style.fontSize = "0.9rem";

		if (type === "error") {
			div.style.backgroundColor = "#f8c0c6";
			div.style.color = "#621820";
		} else {
			div.style.backgroundColor = "#d4edda";
			div.style.color = "#155724";

			// Auto-remove success/info messages after 2 seconds
			setTimeout(() => {
				div.remove();
			}, 3000);
		}

		statusElement.insertAdjacentElement("afterend", div);
	});
}




function hideStatus() {
	statusElement.style.display = "none";
	persistentErrorShown = false;
}

// CSS color validation
function isValidCssColor(color) {
	const s = new Option().style;
	s.color = "";
	s.color = color;
	return s.color !== "";
}

function validateColorInput(input) {
	const value = input.value.trim();

	if (!value) {
		// Empty input is fine
		input.style.backgroundColor = "";
		input.style.color = "";
		return true;
	}

	if (!isValidCssColor(value)) {
		input.style.backgroundColor = "#f8c0c6";
		// input.style.color = "#fff";
		return false;
	} else {
		input.style.backgroundColor = "";
		// input.style.color = "";
		return true;
	}
}


// Disable save button if themes are the same
function validateSelections() {
	let valid = true;
	const messages = [];

	if (lightSelect.value === darkSelect.value) {
		valid = false;
		messages.push("ⓘ Light and dark themes must be different");
	}

	if (darkColorOverrideCheckbox.checked && !validateColorInput(darkColorInput)) {
		valid = false;
		messages.push("ⓘ Invalid dark theme icon color");
	}

	if (lightColorOverrideCheckbox.checked && !validateColorInput(lightColorInput)) {
		valid = false;
		messages.push("ⓘ Invalid light theme icon color");
	}

	saveButton.disabled = !valid;

	if (!valid) {
		showStatus(messages, "error"); // pass array
	} else {
		// Remove all dynamic error boxes when valid
		document.querySelectorAll(".dynamic-status").forEach(el => el.remove());
	}
}



lightSelect.addEventListener("change", validateSelections);
darkSelect.addEventListener("change", validateSelections);

lightColorInput.addEventListener("input", () => {
	validateColorInput(lightColorInput);
	validateSelections(); // optional: disables save if invalid
});
darkColorInput.addEventListener("input", () => {
	validateColorInput(darkColorInput);
	validateSelections();
});

async function loadThemes() {
	// Fetch themes and stored prefs (with sensible defaults)
	const themes = (await browser.management.getAll()).filter(ext => ext.type === "theme");
	const {
		lightTheme = "firefox-compact-light@mozilla.org",
		darkTheme = "firefox-compact-dark@mozilla.org",
		lightColorOverride = false,
		darkColorOverride = false,
		lightColor = "",
		darkColor = ""
	} = await browser.storage.sync.get([
		"lightTheme",
		"darkTheme",
		"lightColorOverride",
		"darkColorOverride",
		"lightColor",
		"darkColor"
	]);

	// Clear existing options to prevent duplicates (this is the important bit)
	lightSelect.innerHTML = "";
	darkSelect.innerHTML = "";

	// Populate selects
	for (const theme of themes) {
		const option = document.createElement("option");
		option.value = theme.id;
		option.textContent = theme.name;

		const option2 = option.cloneNode(true);
		lightSelect.appendChild(option);
		darkSelect.appendChild(option2);
	}

	// Restore selected values
	lightSelect.value = lightTheme;
	darkSelect.value = darkTheme;

	// Restore color override settings
	lightColorOverrideCheckbox.checked = Boolean(lightColorOverride);
	darkColorOverrideCheckbox.checked = Boolean(darkColorOverride);
	lightColorInput.value = lightColor || "";
	darkColorInput.value = darkColor || "";
	lightColorContainer.style.display = lightColorOverride ? "block" : "none";
	darkColorContainer.style.display = darkColorOverride ? "block" : "none";

	// Force reflow to fix dropdown misplacement in Firefox
	darkSelect.style.display = "none";
	void darkSelect.offsetHeight; // trigger reflow
	darkSelect.style.display = "";

	// Validate and update UI state (disables Save if needed, shows errors, etc.)
	validateSelections();
}


async function saveOptions() {
	const lightTheme = lightSelect.value;
	const darkTheme = darkSelect.value;

	// If input is empty, uncheck the checkbox and hide the input container
	if (!lightColorInput.value.trim()) {
		lightColorOverrideCheckbox.checked = false;
		lightColorContainer.style.display = "none";
	}
	if (!darkColorInput.value.trim()) {
		darkColorOverrideCheckbox.checked = false;
		darkColorContainer.style.display = "none";
	}

	const lightColorOverride = lightColorOverrideCheckbox.checked;
	const darkColorOverride = darkColorOverrideCheckbox.checked;
	const lightColor = lightColorOverride ? lightColorInput.value.trim() : "";
	const darkColor = darkColorOverride ? darkColorInput.value.trim() : "";

	const { lastUsed = "light" } = await browser.storage.sync.get("lastUsed");
	await browser.storage.sync.set({
		lightTheme, darkTheme,
		lightColorOverride, darkColorOverride,
		lightColor, darkColor
	});

	// Activate the appropriate theme immediately
	const themeToActivate = lastUsed === "dark" ? darkTheme : lightTheme;
	await browser.management.setEnabled(themeToActivate, true);

	// Update the toolbar icon immediately
	try {
		const bg = await browser.runtime.getBackgroundPage();
		if (bg && typeof bg.updateIconColor === "function") {
			bg.updateIconColor();
		}
	} catch (e) {
		console.warn("Failed to update icon color immediately:", e);
	}

	validateSelections(); // refresh status and validation
	showStatus("Saved", "success");
}




lightColorOverrideCheckbox.addEventListener("change", () => {
	lightColorContainer.style.display = lightColorOverrideCheckbox.checked ? "block" : "none";
});

darkColorOverrideCheckbox.addEventListener("change", () => {
	darkColorContainer.style.display = darkColorOverrideCheckbox.checked ? "block" : "none";
});

saveButton.addEventListener("click", saveOptions);
loadThemes();

restoreButton.addEventListener("click", async () => {
	await browser.storage.sync.clear();

	// Reload with defaults
	await loadThemes();

	// Apply defaults (re-enable light theme by default)
	try {
		await browser.management.setEnabled("firefox-compact-light@mozilla.org", true);
		await browser.storage.sync.set({
			lightTheme: "firefox-compact-light@mozilla.org",
			darkTheme: "firefox-compact-dark@mozilla.org",
			lastUsed: "light"
		});

		// Update toolbar icon immediately
		const bg = await browser.runtime.getBackgroundPage();
		if (bg && typeof bg.updateIconColor === "function") {
			bg.updateIconColor();
		}

		showStatus("Defaults restored", "success");
	} catch (e) {
		console.error("Error applying defaults:", e);
		showStatus("Failed to restore defaults", "error");
	}
});

