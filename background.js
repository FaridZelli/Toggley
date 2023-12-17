function toggleTheme() {
	browser.management.getAll().then(extensions => {
		for (let extension of extensions) {
			if (extension.id !== 'firefox-compact-light@mozilla.org') continue;
			if (extension.enabled) {
				browser.management.get("firefox-compact-dark@mozilla.org").then(info => {
					browser.management.setEnabled("firefox-compact-dark@mozilla.org", !info.enabled);
				})
			} else {
				browser.management.get("firefox-compact-light@mozilla.org").then(info => {
					browser.management.setEnabled("firefox-compact-light@mozilla.org", !info.enabled);
				});
			};
		};
	});
}

browser.action.onClicked.addListener(toggleTheme);

function toggleSystemTheme() {
	browser.management.get("default-theme@mozilla.org").then(info => {
		browser.management.setEnabled("default-theme@mozilla.org", !info.enabled);
	});
}

browser.menus.create({
	id: "use-systemtheme",
	type: "normal",
	title: "Use system theme (auto)",
	contexts: ["action"],
	icons: {
		"16": "icons/browser.svg",
		"32": "icons/browser.svg"
	},
});

browser.menus.onClicked.addListener(toggleSystemTheme);
