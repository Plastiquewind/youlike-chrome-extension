import * as $ from "jquery";
import * as qs from "query-string";
import * as _ from "lodash";
import * as validator from "validator";

import "./youtubeExtension.css";

$(() => YouTubeExtension.init());

class YouTubeExtension {
    private static readonly addVideoBtnText: string = "Добавить в YouLike";
    private static readonly removeVideoBtnText: string = "Удалить из YouLike";
    private static readonly youlikeBtnAccentClassName: string = "youlikeButton_accent";
    private static currentVideoId: string;
    private static youLikeBtn: JQuery<HTMLElement>;

    public static init(): void {
        const youlikeButtonContainerId: string = "youlikeButtonContainer";

        setTimeout(function tick(): void {
            if (window.location.href.indexOf("/watch") < 0) {
                setTimeout(tick, 100);

                return;
            }

            if (document.getElementById("count") && document.getElementById(youlikeButtonContainerId) === null) {
                YouTubeExtension.loadVideosList((videosList: string[]) => {
                    YouTubeExtension.currentVideoId = qs.parse(document.location.search).v;

                    let videoIsInList: boolean = YouTubeExtension.currentVideoIsInList(videosList);
                    let youLikeBtnContainer: JQuery<HTMLElement> = $(`<div id="${youlikeButtonContainerId}"></div>`);
                    // tslint:disable-next-line:max-line-length
                    let youLikeBtnCurrentClassName: string = `youlikeButton ${!videoIsInList ? YouTubeExtension.youlikeBtnAccentClassName : ""}`;

                    YouTubeExtension.youLikeBtn = $(`<paper-button class="${youLikeBtnCurrentClassName}"></paper-button>`);

                    YouTubeExtension.youLikeBtn.text(videoIsInList ? YouTubeExtension.removeVideoBtnText :
                        YouTubeExtension.addVideoBtnText);
                    YouTubeExtension.youLikeBtn.click(() => {
                        YouTubeExtension.loadVideosList((videosList: string[]) => {
                            let videoIndex: number = YouTubeExtension.findCurrentVideoIndex(videosList);
                            let videoIsInList: boolean = videoIndex !== -1;

                            if (videoIsInList) {
                                videosList.splice(videoIndex, 1);
                                YouTubeExtension.updateVideosList(videosList, () => {
                                    videoIsInList = false;

                                    YouTubeExtension.toggleButton(videoIsInList);
                                });
                            } else {
                                if (!videosList) {
                                    videosList = [];
                                }

                                videosList.push(YouTubeExtension.currentVideoId);
                                YouTubeExtension.updateVideosList(videosList, () => {
                                    videoIsInList = true;

                                    YouTubeExtension.toggleButton(videoIsInList);
                                });
                            }
                        });
                    });

                    youLikeBtnContainer.append(YouTubeExtension.youLikeBtn);

                    let targetElement: NodeListOf<Element> = document.querySelectorAll("[id='subscribe-button']");

                    for(let i: number = 0; i < targetElement.length; i++) {
                        if(targetElement[i].className.indexOf("ytd-video-secondary-info-renderer") > -1) {
                            $(targetElement[i]).prepend(youLikeBtnContainer);
                            break;
                        }
                    }

                    /* Fix hidden description bug */
                    let descriptionBox: NodeListOf<Element> = document.querySelectorAll("ytd-video-secondary-info-renderer");

                    if (descriptionBox[0].className.indexOf("loading") > -1) {
                        descriptionBox[0].classList.remove("loading");
                    }

                    YouTubeExtension.enableListener();

                    setTimeout(tick, 100);
                });
            } else {
                setTimeout(tick, 100);
            }
        }, 100);
    }

    private static onChanged: (changes: { videosList: chrome.storage.StorageChange }) => void = (changes) => {
        YouTubeExtension.toggleButton(YouTubeExtension.currentVideoIsInList(changes.videosList.newValue));
    }

    private static toggleButton(videoIsInList: boolean): void {
        if (videoIsInList) {
            YouTubeExtension.youLikeBtn.text(YouTubeExtension.removeVideoBtnText);
            YouTubeExtension.youLikeBtn.removeClass(YouTubeExtension.youlikeBtnAccentClassName);
        } else {
            YouTubeExtension.youLikeBtn.text(YouTubeExtension.addVideoBtnText);
            YouTubeExtension.youLikeBtn.addClass(YouTubeExtension.youlikeBtnAccentClassName);
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