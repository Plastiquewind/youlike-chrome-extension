import * as $ from "jquery";
import * as qs from "query-string";
import * as _ from "lodash";
import * as validator from "validator";

$(() => YouLikeExtension.init());

class YouLikeExtension {
    private static readonly videosListKey: string = "videosList";
    private static readonly storagesAreSynchronizedKey: string = "storagesAreSynchronized";
    private static forceUpdateBtn: JQuery<HTMLButtonElement>;

    private static onChanged: (changes: { videosList: chrome.storage.StorageChange }) => void = (changes) => {
        if (changes.videosList &&
            changes.videosList.newValue &&
            changes.videosList.newValue.length > 0) {
            localStorage.videosList = JSON.stringify(changes.videosList.newValue);
        } else {
            localStorage.removeItem(YouLikeExtension.videosListKey);
        }

        YouLikeExtension.forceUpdateBtn.click();
    }

    public static init(): void {
        YouLikeExtension.forceUpdateBtn = <JQuery<HTMLButtonElement>>$("#forceUpdate");

        chrome.storage.local.get([YouLikeExtension.videosListKey, YouLikeExtension.storagesAreSynchronizedKey],
            (items: { videosList: string[], storagesAreSynchronized: boolean }) => {
            let dataToSave: string[];

            if (!items.storagesAreSynchronized) {
                if (localStorage.videosList) {
                    dataToSave = _.unionBy(items.videosList, JSON.parse(localStorage.videosList),
                        (video: string) => validator.isURL(video) ? qs.parse(qs.extract(video)).v : video);
                } else {
                    dataToSave = items.videosList;
                }

                YouLikeExtension.disableListener();
                chrome.storage.local.set({ videosList: dataToSave, storagesAreSynchronizedKey: true },
                    () => YouLikeExtension.enableListener());
            } else {
                dataToSave = items.videosList;
            }

            if (dataToSave) {
                localStorage.videosList = JSON.stringify(dataToSave);
            } else {
                localStorage.removeItem("videosList");
            }

            YouLikeExtension.forceUpdateBtn.click();
        });

        $("#saveListBtn").click(() => {
            YouLikeExtension.disableListener();
            chrome.storage.local.set({ videosList: JSON.parse(localStorage.videosList) }, () => {
                YouLikeExtension.enableListener();
            });
        });
        $("#confirmDeleteDialog .md-confirm-button").click(() => {
            YouLikeExtension.disableListener();
            chrome.storage.local.set({ videosList: null },
                () => YouLikeExtension.enableListener());
        });

        YouLikeExtension.enableListener();
    }

    private static enableListener(): void {
        chrome.storage.onChanged.addListener(YouLikeExtension.onChanged);
    }

    private static disableListener(): void {
        chrome.storage.onChanged.removeListener(YouLikeExtension.onChanged);
    }
}