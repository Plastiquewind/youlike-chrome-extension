class Background {
    public static init(): void {
        chrome.browserAction.onClicked.addListener(() => chrome.tabs.create({ url: "https://youlikeapp.github.io"}));
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo && changeInfo.status === "complete") {
                Background.injectScripts(tab);
            }
        });
        chrome.tabs.onCreated.addListener((tab) => {
            Background.injectScripts(tab);
        });

        chrome.storage.local.get("videosList", (items: { videosList: string[]; }) => {
            let count: number = items.videosList ? items.videosList.length : 0;

            Background.setBadgeText(count);
        });

        chrome.storage.onChanged.addListener((changes: { videosList: chrome.storage.StorageChange;},
            areaName: string) => {
            let count: number = changes.videosList ?
                changes.videosList.newValue ? changes.videosList.newValue.length : 0 : 0;

            Background.setBadgeText(count);
        });
    }

    private static setBadgeText(count: number): void {
        chrome.browserAction.setBadgeText({ text: count > 999 ? "999+" : count.toString() });
    }

    private static injectScripts(tab: chrome.tabs.Tab): void {
        let url: string = tab.url.toLowerCase();

        if (url.match(/^(?:https:\/\/)?(?:www\.)?youtube\.com\/watch\?.+/)) {
            chrome.tabs.executeScript({
                file: "js/vendor.js"
            });
            chrome.tabs.executeScript({
                file: "js/youtubeExtension.js"
            });
        } else if (url.match(/^(?:https:\/\/)?youlikeapp.github.io\/?/)) {
            chrome.tabs.executeScript({
                file: "js/vendor.js"
            });
            chrome.tabs.executeScript({
                file: "js/youlikeExtension.js"
            });
        }
    }
}

Background.init();