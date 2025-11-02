const lightSelect = document.getElementById("light-select");
const darkSelect = document.getElementById("dark-select");

const lightColorOverrideCheckbox = document.getElementById("light-color-override-checkbox");
const darkColorOverrideCheckbox = document.getElementById("dark-color-override-checkbox");

const lightColorContainer = document.getElementById("light-color-container");
const darkColorContainer = document.getElementById("dark-color-container");

const lightColorInput = document.getElementById("light-color-input");
const darkColorInput = document.getElementById("dark-color-input");

const prefersColorSchemeSelect = document.getElementById("prefers-color-scheme-select");

const saveButton = document.getElementById("save-button");
const resetButton = document.getElementById("reset-button");
const defaultsButton = document.getElementById("defaults-button");

const statusMessage = document.getElementById("status-message");

let persistentErrorShown = false;

function showStatus(message, type = "error") {
	document.querySelectorAll(".dynamic-status").forEach(el => el.remove());

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
			setTimeout(() => {
				div.remove();
			}, 3000);
		}

		statusMessage.insertAdjacentElement("afterend", div);
	});
}

function hideStatus() {
	statusMessage.style.display = "none";
	persistentErrorShown = false;
}

function validateCssColor(color) {
	const s = new Option().style;
	s.color = "";
	s.color = color;
	return s.color !== "";
}

function validateColorInput(input) {
	const value = input.value.trim();

	if (!value) {
		input.style.backgroundColor = "";
		input.style.color = "";
		return true;
	}

	if (!validateCssColor(value)) {
		input.style.backgroundColor = "#f8c0c6";
		return false;
	} else {
		input.style.backgroundColor = "";
		return true;
	}
}

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
		showStatus(messages, "error");
	} else {
		document.querySelectorAll(".dynamic-status").forEach(el => el.remove());
	}
}

async function loadThemes() {
	// Fetch list of installed themes
	const themes = (await browser.management.getAll())
	.filter(ext => ext.type === "theme" && ext.id !== "default-theme@mozilla.org");

	const prefs = await browser.storage.sync.get(DEFAULT_PREFS);
	const {
		lightTheme,
		darkTheme,
		lightColorOverride,
		darkColorOverride,
		lightColor,
		darkColor,
		prefersColorSchemeOverride
	} = prefs;

	// Clear existing options to prevent duplicates
	lightSelect.innerHTML = "";
	darkSelect.innerHTML = "";

	// Populate selections
	for (const theme of themes) {
		const option = document.createElement("option");
		option.value = theme.id;
		option.textContent = theme.name;

		const option2 = option.cloneNode(true);
		lightSelect.appendChild(option);
		darkSelect.appendChild(option2);
	}

	// Restore selected values (if saved value isn't in the list, fall back to the first entry)
	lightSelect.value = Array.from(lightSelect.options).some(o => o.value === lightTheme) ? lightTheme : (lightSelect.options[0]?.value || "");
	darkSelect.value = Array.from(darkSelect.options).some(o => o.value === darkTheme) ? darkTheme : (darkSelect.options[0]?.value || "");

	// Restore color override settings
	lightColorOverrideCheckbox.checked = Boolean(lightColorOverride);
	darkColorOverrideCheckbox.checked = Boolean(darkColorOverride);
	lightColorInput.value = lightColor || "";
	darkColorInput.value = darkColor || "";
	lightColorContainer.style.display = lightColorOverride ? "block" : "none";
	darkColorContainer.style.display = darkColorOverride ? "block" : "none";

	// Restore color scheme settings
	prefersColorSchemeSelect.value = (prefersColorSchemeOverride === "firefox") ? "firefox" : "toggley";

	// Force reflow to fix incorrectly positioned dropdown menu in Firefox
	lightSelect.style.display = "none";
	void lightSelect.offsetHeight;
	lightSelect.style.display = "";

	darkSelect.style.display = "none";
	void darkSelect.offsetHeight;
	darkSelect.style.display = "";

	// Validate selections
	validateSelections();
}

async function saveOptions() {
	const lightTheme = lightSelect.value;
	const darkTheme = darkSelect.value;

	// Apply preferences
	try {
		// If input fields are empty on save, uncheck the box and hide the input container
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

		const prefersColorSchemeOverride = (prefersColorSchemeSelect.value === "firefox") ? "firefox" : "toggley";

		const { lastUsed = "light" } = await browser.storage.sync.get("lastUsed");
		await browser.storage.sync.set({
			lightTheme, darkTheme,
			lightColorOverride, darkColorOverride,
			lightColor, darkColor,
			prefersColorSchemeOverride
		});

		// Update theme immediately
		const themeToActivate = lastUsed === "dark" ? darkTheme : lightTheme;
		await browser.management.setEnabled(themeToActivate, true);

		// Update toolbar icon immediately
		const bg = await browser.runtime.getBackgroundPage();
		if (bg && typeof bg.updateIconColor === "function") {
			bg.updateIconColor();
		}

		// Validate selections
		validateSelections();
		await loadThemes();
		showStatus("Saved", "success");
	} catch (e) {
		console.error("Error applying preferences:", e);
		showStatus("Failed to apply preferences", "error");
	}
};

async function defaultOptions() {
	// Clear persistent storage
	await browser.storage.sync.clear();

	// Apply defaults
	try {
		// Change to light theme and set defaults
		await browser.management.setEnabled(DEFAULT_PREFS.lightTheme, true);
		await browser.storage.sync.set({ ...DEFAULT_PREFS });

		// Update toolbar icon immediately
		const bg = await browser.runtime.getBackgroundPage();
		if (bg && typeof bg.updateIconColor === "function") {
			bg.updateIconColor();
		}

		// Validate selections
		validateSelections();
		await loadThemes();
		showStatus("Defaults restored", "success");
	} catch (e) {
		console.error("Error applying defaults:", e);
		showStatus("Failed to restore defaults", "error");
	}
};

lightColorOverrideCheckbox.addEventListener("change", () => {
	const isChecked = lightColorOverrideCheckbox.checked;
	lightColorContainer.style.display = isChecked ? "block" : "none";
	validateSelections();

	if (!isChecked) {
		lightColorInput.value = "";
		validateSelections();
	}
});

darkColorOverrideCheckbox.addEventListener("change", () => {
	const isChecked = darkColorOverrideCheckbox.checked;
	darkColorContainer.style.display = isChecked ? "block" : "none";
	validateSelections();

	if (!isChecked) {
		darkColorInput.value = "";
		validateSelections();
	}
});

lightColorInput.addEventListener("input", () => {
	validateColorInput(lightColorInput);
	validateSelections();
});
darkColorInput.addEventListener("input", () => {
	validateColorInput(darkColorInput);
	validateSelections();
});

lightSelect.addEventListener("change", validateSelections);

darkSelect.addEventListener("change", validateSelections);

saveButton.addEventListener("click", saveOptions);
loadThemes();

resetButton.addEventListener("click", async () => {
	validateSelections();
	await loadThemes();
});

defaultsButton.addEventListener("click", defaultOptions);
loadThemes();
