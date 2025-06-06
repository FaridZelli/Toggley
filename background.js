function toggleTheme(input) {
	const lightId = 'firefox-compact-light@mozilla.org';
	const darkId = 'firefox-compact-dark@mozilla.org';

	let desiredMode = null;

	if (typeof input === 'string') {
		if (input === 'light' || input === 'dark') desiredMode = input;
	}

	function toggleExtensions(arg) {
		let enable = arg === 'light';
		browser.management.setEnabled(lightId, enable);
		browser.management.setEnabled(darkId, !enable);
	}

	browser.management.getAll().then(extensions => {
		const lightExt = extensions.find(e => e.id === lightId);
		const darkExt = extensions.find(e => e.id === darkId);

		if (!lightExt || !darkExt) {
			return;
		}

		if (desiredMode === null) {
			systemTheme(false);
			applyCustomSchedule(false);
			lightExt.enabled ? toggleExtensions('dark') : toggleExtensions('light');
		} else {
			toggleExtensions(desiredMode);
		}
	});
}

browser.action.onClicked.addListener(() => toggleTheme(null));

function toggleThemeSetting(input, menuId) {
	let enableTheme;

	enableTheme = typeof input === 'object' && input.menuItemId === menuId ? input.checked : Boolean(input);

	if (menuId === 'use-systemTheme' && enableTheme) {
		applyCustomSchedule(false);
	} else if (menuId === 'use-customSchedule' && enableTheme) {
		systemTheme(false);
	}

	browser.menus.update(menuId, { checked: enableTheme });

	return enableTheme;
}

function systemTheme(input) {
	const enableTheme = toggleThemeSetting(input, "use-systemTheme");

	if (enableTheme) {
		browser.management.get("default-theme@mozilla.org").then(info => {
			if (!info.enabled) {
				browser.management.setEnabled("default-theme@mozilla.org", true);
			}
		});
	}
}

function applyCustomSchedule(input) {
	const enabled = toggleThemeSetting(input, "use-customSchedule");
	if (enabled) {
		startSchedulePolling();
	} else {
		browser.alarms.clear("checkTheme");
	}
}

let lastAppliedTheme = null;

function startSchedulePolling() {
	checkAndApplyTheme();
	browser.alarms.clear("checkTheme");
	lastAppliedTheme = null;
	browser.alarms.create("checkTheme", { periodInMinutes: 1 });
}

function getMinutes(t) {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + m;
}

function checkAndApplyTheme() {
	const now = new Date();
	const current = now.getHours() * 60 + now.getMinutes();

	browser.storage.local.get("themeSchedule").then(result => {
		const s = result.themeSchedule || { light: "06:00", dark: "18:00" };
		const light = getMinutes(s.light);
		const dark = getMinutes(s.dark);

		const newTheme =
			light < dark
				? current >= light && current < dark ? "light" : "dark"
				: current >= light || current < dark ? "light" : "dark";

		if (newTheme !== lastAppliedTheme) {
			lastAppliedTheme = newTheme;
			toggleTheme(newTheme);
		}
	});
}

browser.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === "checkTheme") {
		checkAndApplyTheme();
	}
});

browser.menus.onClicked.addListener((info, tab) => {
	switch (info.menuItemId) {
		case "use-systemTheme":
			systemTheme(info);
			break;
		case "use-customSchedule":
			applyCustomSchedule(info);
			break;
		case "customizeTheme":
			browser.tabs.create({
				url: browser.runtime.getURL("settings.html")
			});
			break;
		default:
			console.warn("Unhandled menu item:", info.menuItemId);
	}
});

browser.runtime.onInstalled.addListener(() => {
	browser.menus.create({
		id: "use-systemTheme",
		type: "checkbox",
		title: "Use system theme (auto)",
		contexts: ["action"],
		checked: false
	});

	browser.menus.create({
		id: "use-customSchedule",
		type: "checkbox",
		title: "Use scheduled theme (custom)",
		contexts: ["action"],
		checked: false
	});

	browser.menus.create({
		id: "customizeTheme",
		type: "normal",
		title: "Customize theme schedule",
		contexts: ["action"],
		icons: {
			"16": "icons/browser.svg",
			"32": "icons/browser.svg"
		}
	});
});