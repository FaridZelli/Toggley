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

	// Get currently enabled themes
	const themes = await browser.management.getAll();
	const enabledTheme = themes.find(ext => ext.type === "theme" && ext.enabled);

	// Determine theme based on stored IDs
	let currentMode = "light";
	if (enabledTheme) {
		if (enabledTheme.id === darkTheme) currentMode = "dark";
		else if (enabledTheme.id === lightTheme) currentMode = "light";
		else {
			// Current theme is something else, default to light
			currentMode = "light";
		}
	}

	const theme = await browser.theme.getCurrent();
	const colors = theme?.colors || {};

	const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const fallbackColor = systemPrefersDark ? "rgb(251,251,254)" : "rgb(91,91,102)";

	let strokeColor = colors.icons ?? colors.toolbar_text ?? fallbackColor;

	if (currentMode === "light" && lightColorOverride && lightColor) {
		strokeColor = lightColor;
	} else if (currentMode === "dark" && darkColorOverride && darkColor) {
		strokeColor = darkColor;
	}

	// SVGs
	const svgLight = `
	<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

	const svgDark = `
	<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

	const svg = currentMode === "dark" ? svgLight : svgDark;

	// Encode and set Toggley's icon
	const encodedSvg = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
	await browser.action.setIcon({ path: encodedSvg });
}

updateIconColor();

browser.theme.onUpdated.addListener(updateIconColor);
