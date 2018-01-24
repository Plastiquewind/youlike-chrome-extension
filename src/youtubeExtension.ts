import * as $ from "jquery";
import * as qs from "query-string";
import * as _ from "lodash";
import * as validator from "validator";

import "./youtubeExtension.css";

$(() => YouTubeExtension.init());

class YouTubeExtension {
    private static readonly addVideoBtnText: string = "Добавить в YouLike";
    private static readonly removeVideoBtnText: string = "Удалить из YouLike";
    private static readonly currentVideoId: string = qs.parse(document.location.search).v;
    private static youLikeBtn: JQuery<HTMLElement>;

    public static init(): void {
        YouTubeExtension.loadVideosList((videosList: string[]) => {
            let videoIsInList: boolean = YouTubeExtension.currentVideoIsInList(videosList);
            let youLikeBtn: JQuery<HTMLElement> = $(`<paper-button class="button-youlike"></paper-button>`);

            youLikeBtn.text(videoIsInList ? YouTubeExtension.removeVideoBtnText :
                YouTubeExtension.addVideoBtnText);
            youLikeBtn.click(() => {
                YouTubeExtension.loadVideosList((videosList: string[]) => {
                    let videoIndex: number = YouTubeExtension.findCurrentVideoIndex(videosList);
                    let videoIsInList: boolean = videoIndex !== -1;

                    if (videoIsInList) {
                        videosList.splice(videoIndex, 1);
                        YouTubeExtension.updateVideosList(videosList, () => {
                            videoIsInList = false;
                            youLikeBtn.text(YouTubeExtension.addVideoBtnText);
                        });
                    } else {
                        if (!videosList) {
                            videosList = [];
                        }

                        videosList.push(YouTubeExtension.currentVideoId);
                        YouTubeExtension.updateVideosList(videosList, () => {
                            videoIsInList = true;
                            youLikeBtn.text(YouTubeExtension.removeVideoBtnText);
                        });
                    }
                });
            });

            let timer: number = setInterval(() => {
                if ($("#notification-button").length > 0) {
                    $(".button-youlike").remove();
                    YouTubeExtension.youLikeBtn = youLikeBtn.insertAfter("#notification-button");

                    clearInterval(timer);
                }
            }, 1000);
        });
        YouTubeExtension.enableListener();
    }

    private static onChanged: (changes: { videosList: chrome.storage.StorageChange }) => void = (changes) => {
        if (YouTubeExtension.currentVideoIsInList(changes.videosList.newValue)) {
            YouTubeExtension.youLikeBtn.text(YouTubeExtension.removeVideoBtnText);
        } else {
            YouTubeExtension.youLikeBtn.text(YouTubeExtension.addVideoBtnText);
        }
    }

    private static updateVideosList(newVideosList: string[], callback?: () => void): void {
        YouTubeExtension.disableListener();
        chrome.storage.local.set({ videosList: newVideosList }, () => {
            YouTubeExtension.enableListener();

            if (callback) {
                callback();
            }
        });
    }

    private static enableListener(): void {
        chrome.storage.onChanged.addListener(YouTubeExtension.onChanged);
    }

    private static disableListener(): void {
        chrome.storage.onChanged.removeListener(YouTubeExtension.onChanged);
    }

    private static findCurrentVideoIndex(source: string[]): number {
        return _.findIndex(source,
            (video: string) => (validator.isURL(video) ? qs.parse(qs.extract(video)).v : video) === YouTubeExtension.currentVideoId);
    }

    private static currentVideoIsInList(source: string[]): boolean {
        return YouTubeExtension.findCurrentVideoIndex(source) !== -1;
    }

    private static loadVideosList(callback: (videosList: string[]) => void): void {
        chrome.storage.local.get("videosList", (items) => callback(items.videosList));
    }
}
