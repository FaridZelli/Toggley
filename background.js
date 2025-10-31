function normalizeColor(value) {
	if (typeof value === "string") {
		return value.trim();
	}

	if (Array.isArray(value) && value.length >= 3) {
		let [r, g, b] = value;

		if (r <= 1 && g <= 1 && b <= 1) {
			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);
		}

		r = Math.min(255, Math.max(0, Math.round(r)));
		g = Math.min(255, Math.max(0, Math.round(g)));
		b = Math.min(255, Math.max(0, Math.round(b)));

		return `rgb(${r}, ${g}, ${b})`;
	}

	return value;
}

async function getThemePrefs() {
	const defaults = {
		lightTheme: "firefox-compact-light@mozilla.org",
		darkTheme: "firefox-compact-dark@mozilla.org",
		lastUsed: "light"
	};
	const prefs = await browser.storage.sync.get(defaults);
	return prefs;
}

async function toggleTheme() {
	const { lightTheme, darkTheme, lastUsed } = await getThemePrefs();

	// Get info for both themes
	const lightInfo = await browser.management.get(lightTheme).catch(() => null);
	const darkInfo = await browser.management.get(darkTheme).catch(() => null);

	if (!lightInfo || !darkInfo) return;

	if (lastUsed === "light") {
		await browser.management.setEnabled(darkTheme, true);
		await browser.storage.sync.set({ lastUsed: "dark" });
	} else {
		await browser.management.setEnabled(lightTheme, true);
		await browser.storage.sync.set({ lastUsed: "light" });
	}
}

browser.action.onClicked.addListener(toggleTheme);

async function updateIconColor() {
	const {
		lightTheme,
		darkTheme,
		lightColorOverride = false,
		darkColorOverride = false,
		lightColor = "",
		darkColor = ""
	} = await browser.storage.sync.get({
		lightTheme: "firefox-compact-light@mozilla.org",
		darkTheme: "firefox-compact-dark@mozilla.org",
		lightColorOverride: false,
		darkColorOverride: false,
		lightColor: "",
		darkColor: ""
	});

	// Get currently enabled theme
	const themes = await browser.management.getAll();
	const enabledTheme = themes.find(ext => ext.type === "theme" && ext.enabled);

	// Determine theme type based on stored IDs
	let currentMode = "light";
	if (enabledTheme) {
		if (enabledTheme.id === darkTheme) currentMode = "dark";
		else if (enabledTheme.id === lightTheme) currentMode = "light";
		else if (enabledTheme.id === "default-theme@mozilla.org") currentMode = "system";
		else {
			// Default to light if the current theme is different
			currentMode = "light";
		}
	}

	// Apply prefs override corresponding to currentMode (keeps content prefers-color-scheme in sync)
	try {
		if (browser.browserSettings && browser.browserSettings.overrideContentColorScheme && typeof browser.browserSettings.overrideContentColorScheme.set === "function") {
			let value = "auto";
			if (currentMode === "light") value = "light";
			else if (currentMode === "dark") value = "dark";
			else if (currentMode === "system") value = "auto";
			await browser.browserSettings.overrideContentColorScheme.set({ value });
		}
	} catch (e) {
		// Non-fatal: if the API isn't available for some Firefox build, just continue.
		console.warn("Could not set overrideContentColorScheme:", e);
	}

	const theme = await browser.theme.getCurrent();
	const colors = theme?.colors || {};

	const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const fallbackColor = systemPrefersDark ? "rgb(251,251,254)" : "rgb(91,91,102)";

	const iconColor = normalizeColor(colors.icons);
	const textColor = normalizeColor(colors.toolbar_text);

	let strokeColor = iconColor ?? textColor ?? fallbackColor;

	if (currentMode === "light" && lightColorOverride && lightColor) {
		strokeColor = lightColor;
	} else if (currentMode === "dark" && darkColorOverride && darkColor) {
		strokeColor = darkColor;
	}

	// SVGs
	const svgLight = `
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

	const svgDark = `
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

	const svgSystem = `
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

	let svg;
	if (currentMode === "system") {
		svg = svgSystem;
	} else {
		svg = currentMode === "dark" ? svgLight : svgDark;
	}

	// Encode and set Toggley's icon
	const encodedSvg = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
	await browser.action.setIcon({ path: encodedSvg });
}

updateIconColor();

browser.theme.onUpdated.addListener(updateIconColor);
browser.runtime.onStartup.addListener(updateIconColor);
browser.runtime.onInstalled.addListener(updateIconColor);

browser.menus.create({
	id: "open-preferences",
	title: "Modify Toggley",
	contexts: ["action"],
	icons: {
		"16": "icons/modify.svg",
		"32": "icons/modify.svg"
	},
});

browser.menus.create({
	id: "use-system-theme",
	title: "Use system theme (auto)",
	contexts: ["action"],
	icons: {
		"16": "icons/toggley.svg",
		"32": "icons/toggley.svg"
	},
});

browser.menus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "open-preferences") {
		browser.runtime.openOptionsPage();
	} else if (info.menuItemId === "use-system-theme") {
		try {
			await browser.management.setEnabled("default-theme@mozilla.org", true);
			await browser.storage.sync.set({ lastUsed: "system" });

			try {
				if (browser.browserSettings && browser.browserSettings.overrideContentColorScheme && typeof browser.browserSettings.overrideContentColorScheme.set === "function") {
					await browser.browserSettings.overrideContentColorScheme.set({ value: "auto" });
				}
			} catch (e) {
				console.warn("Could not set overrideContentColorScheme from menu:", e);
			}

			await updateIconColor();
		} catch (e) {
			console.error("Failed to switch to system theme:", e);
		}
	}
});
