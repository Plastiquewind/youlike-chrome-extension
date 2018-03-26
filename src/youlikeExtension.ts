import * as $ from 'jquery';
import * as qs from 'query-string';
import * as _ from 'lodash';
import * as validator from 'validator';
import { LocalStorageVideoObj } from './youtubeExtension';

$(() => YouLikeExtension.init());

class YouLikeExtension {
    private static readonly videosListKey: string = 'videosList';
    private static readonly storagesAreSynchronizedKey: string = 'storagesAreSynchronized';
    private static forceUpdateBtn: JQuery<HTMLButtonElement>;

    private static onChanged: (changes: { videosList: chrome.storage.StorageChange }) => void = changes => {
        if (changes.videosList && changes.videosList.newValue && changes.videosList.newValue.length > 0) {
            YouLikeExtension.updateLocalStorage(changes.videosList.newValue)
        } else {
            localStorage.removeItem(YouLikeExtension.videosListKey);
        }

        YouLikeExtension.forceUpdateBtn.click();
    };

    private static getIdMapFromLocalStorage: () => { [id: string]: any } = () => {
        const storedMap: { [id: string]: any } = {};
        const storageData: (string | LocalStorageVideoObj)[] = JSON.parse(localStorage.videosList);
        storageData.map(item => {
            if (typeof item === 'object') {
                const key = Object.keys(item)[0];
                storedMap[key] = item[key];
            } else {
                storedMap[item] = item;
            }
        });
        return storedMap;
    };

    private static updateLocalStorage: (idsToSave: string[]) => void = idsToSave => {
        const idMapFromLocalStorage: { [id: string]: any } = YouLikeExtension.getIdMapFromLocalStorage();
        const updateList: (string | LocalStorageVideoObj)[] = idsToSave.map(id => {
            return idMapFromLocalStorage[id] ? { [id]: idMapFromLocalStorage[id] } : id;
        });
        localStorage.videosList = JSON.stringify(updateList);
    };

    public static init(): void {
        YouLikeExtension.forceUpdateBtn = <JQuery<HTMLButtonElement>>$('#forceUpdate');

        chrome.storage.local.get(
            [YouLikeExtension.videosListKey, YouLikeExtension.storagesAreSynchronizedKey],
            (items: { videosList: string[]; storagesAreSynchronized: boolean }) => {
                let idsToSave: string[];

                if (!items.storagesAreSynchronized) {
                    if (localStorage.videosList) {
                        const localStorageIdMap = this.getIdMapFromLocalStorage();
                        idsToSave = _.unionBy(
                            items.videosList,
                            Object.keys(localStorageIdMap),
                            (video: string) => (validator.isURL(video) ? qs.parse(qs.extract(video)).v : video)
                        );
                    } else {
                        idsToSave = items.videosList;
                    }

                    YouLikeExtension.disableListener();
                    chrome.storage.local.set({ videosList: idsToSave, storagesAreSynchronized: true }, () =>
                        YouLikeExtension.enableListener()
                    );
                } else {
                    idsToSave = items.videosList;
                }

                if (idsToSave) {
                    this.updateLocalStorage(idsToSave);
                    // localStorage.videosList = JSON.stringify(idsToSave);
                } else {
                    localStorage.removeItem('videosList');
                }

                YouLikeExtension.forceUpdateBtn.click();
            }
        );

        $('#saveListBtn').click(() => {
            YouLikeExtension.disableListener();
            chrome.storage.local.set({ videosList: Object.keys(this.getIdMapFromLocalStorage()) }, () => {
                YouLikeExtension.enableListener();
            });
        });
        $('#confirmDeleteDialog .md-confirm-button').click(() => {
            YouLikeExtension.disableListener();
            chrome.storage.local.set({ videosList: null }, () => YouLikeExtension.enableListener());
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
