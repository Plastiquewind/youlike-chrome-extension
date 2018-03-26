import * as $ from "jquery";
import * as qs from "query-string";
import * as _ from "lodash";
import * as validator from "validator";

import "./youtubeExtension.css";

$(() => {
    if (document.getElementById("polymer-app") || document.getElementById("masthead") || (<any>window).Polymer) {
        YouTubeModernExtension.getInstance().run();
    } else {
        YouTubeClassicExtension.getInstance().run();
    }
});

export type LocalStorageVideoObj = {
    [videoId: string]: {
        comment: any[]
        lastBotCheck: string
    }
}

abstract class YouTubeExtensionBase {
    protected readonly addVideoBtnText: string = "Добавить в YouLike";
    protected readonly removeVideoBtnText: string = "Удалить из YouLike";
    protected readonly youlikeButtonContainerId: string = "youlikeButtonContainer";
    protected currentVideoId: string;
    protected youLikeBtn: JQuery<HTMLElement>;

    protected abstract get youlikeBtnAccentClassName(): string;

    protected onChanged: (changes: { videosList: chrome.storage.StorageChange }) => void = (changes) => {
        this.toggleButton(this.currentVideoIsInList(changes.videosList.newValue));
    }

    protected onClicked: () => void = () => {
        this.loadVideosList((videosList: string []) => {
            let videoIndex: number = this.findCurrentVideoIndex(videosList);
            let videoIsInList: boolean = videoIndex !== -1;

            if (videoIsInList) {
                videosList.splice(videoIndex, 1);
                this.updateVideosList(videosList, () => {
                    videoIsInList = false;

                    this.toggleButton(videoIsInList);
                });
            } else {
                if (!videosList) {
                    videosList = [];
                }

                videosList.push(this.currentVideoId);
                this.updateVideosList(videosList, () => {
                    videoIsInList = true;

                    this.toggleButton(videoIsInList);
                });
            }
        });
    }

    protected toggleButton(videoIsInList: boolean): void {
        if (videoIsInList) {
            this.youLikeBtn.text(this.removeVideoBtnText);
            this.youLikeBtn.removeClass(this.youlikeBtnAccentClassName);
        } else {
            this.youLikeBtn.text(this.addVideoBtnText);
            this.youLikeBtn.addClass(this.youlikeBtnAccentClassName);
        }
    }

    protected updateVideosList(newVideosList: string[], callback?: () => void): void {
        this.disableListener();
        chrome.storage.local.set({ videosList: newVideosList }, () => {
            this.enableListener();

            if (callback) {
                callback();
            }
        });
    }

    protected enableListener(): void {
        chrome.storage.onChanged.addListener(this.onChanged);
    }

    protected disableListener(): void {
        chrome.storage.onChanged.removeListener(this.onChanged);
    }

    protected findCurrentVideoIndex(source: string[]): number {
        return _.findIndex(source,
            (video: string) => (validator.isURL(video) ? qs.parse(qs.extract(video)).v : video) === this.currentVideoId);
    };

    protected currentVideoIsInList(source: string []): boolean {
        return this.findCurrentVideoIndex(source) !== -1;
    }

    protected loadVideosList(callback: (videosList: string[]) => void): void {
        chrome.storage.local.get("videosList", (items) => callback(items.videosList));
    }

    public abstract run(): void;
}

class YouTubeModernExtension extends YouTubeExtensionBase {
    protected youlikeBtnAccentClassName: string = "youlikeButton_accent";
    private static instance: YouTubeModernExtension = new YouTubeModernExtension();

    private constructor() {
        super();
    }

    public static getInstance(): YouTubeModernExtension {
        return YouTubeModernExtension.instance;
    }

    public run(): void {
        const self: YouTubeModernExtension = this;

        setTimeout(function tick(): void {
            if (window.location.href.indexOf("/watch") < 0) {
                setTimeout(tick, 100);

                return;
            }

            if (document.getElementById("count") && document.getElementById(self.youlikeButtonContainerId) === null) {
                self.loadVideosList((videosList: string[]) => {
                    self.currentVideoId = qs.parse(document.location.search).v;

                    let videoIsInList: boolean = self.currentVideoIsInList(videosList);
                    // tslint:disable-next-line:max-line-length
                    let youLikeBtnContainer: JQuery<HTMLElement> = $(`<div id="${self.youlikeButtonContainerId}" class="youlikeButtonContainer_modern"></div>`);
                    // tslint:disable-next-line:max-line-length
                    let youLikeBtnCurrentClassName: string = `youlikeButton_modern ${!videoIsInList ? self.youlikeBtnAccentClassName : ""}`;

                    self.youLikeBtn = $(`<paper-button class="${youLikeBtnCurrentClassName}"></paper-button>`);

                    self.youLikeBtn.text(videoIsInList ? self.removeVideoBtnText :
                        self.addVideoBtnText);
                    self.youLikeBtn.click(self.onClicked);

                    youLikeBtnContainer.append(self.youLikeBtn);

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

                    self.enableListener();

                    setTimeout(tick, 100);
                });
            } else {
                setTimeout(tick, 100);
            }
        }, 100);
    }
}

class YouTubeClassicExtension extends YouTubeExtensionBase {
    protected youlikeBtnAccentClassName: string = "youlikeButton_accent";

    private static instance: YouTubeClassicExtension = new YouTubeClassicExtension();

    private constructor() {
        super();
    }

    public static getInstance(): YouTubeClassicExtension {
        return YouTubeClassicExtension.instance;
    }

    public run(): void {
        const pageContainer: HTMLElement = document.getElementById("page-container");

        if (!pageContainer) {
            return;
        }

        if (window.location.href.indexOf("/watch") > -1) {
            this.renderButton();
        }

        let isAjax: boolean = /class[\w\s"'-=]+spf\-link/.test(pageContainer.innerHTML);
        let logoContainer: HTMLElement = document.getElementById("logo-container");

        // fix for blocked videos
        if (logoContainer && !isAjax) {
            isAjax = (" "+ logoContainer.className + " ").indexOf(" spf-link ")>=0;
        }

        let content: HTMLElement = document.getElementById("content");

        // ajax UI
        if (isAjax && content) {
            let mo: any = (<any>window).MutationObserver || (<any>window).WebKitMutationObserver;

            if (mo !== undefined) {
                let observer: MutationObserver = new mo((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes !== null) {
                            for (let i: number = 0; i < mutation.addedNodes.length; i++) {
                                if (mutation.addedNodes[i].id === "watch7-container" ||
                                    // old value: movie_player
                                    mutation.addedNodes[i].id === "watch7-main-container") {
                                    this.renderButton();

                                    break;
                                }
                            }
                        }
                    });
                });

                // old value: pageContainer
                observer.observe(content, {childList: true, subtree: true});
            } else {
                // mutationObserver fallback for old browsers
                pageContainer.addEventListener("DOMNodeInserted", this.onNodeInserted, false);
            }
        }
    }

    private renderButton(): void {
        if (document.getElementById(this.youlikeButtonContainerId) === null && window.location.href.indexOf("/watch") > -1) {
            this.loadVideosList((videosList: string[]) => {
                this.currentVideoId = qs.parse(document.location.search).v;

                let videoIsInList: boolean = this.currentVideoIsInList(videosList);
                let buttonText: string = videoIsInList ? this.removeVideoBtnText : this.addVideoBtnText;
                let buttonClass: string = "yt-uix-button yt-uix-button-default youlikeButtonContainer_classic";
                buttonClass += !videoIsInList ? " " + this.youlikeBtnAccentClassName : "";

                this.youLikeBtn = $(`
                <div id="${this.youlikeButtonContainerId}" class="${buttonClass}">
                    <span class="yt-uix-button-content">
                        ${buttonText}
                    <span>
                </div>`);

                this.youLikeBtn.click(this.onClicked);

                $("#watch7-user-header").append(this.youLikeBtn);
            });
        }
    }

    private onNodeInserted(e: Event): void {
        if (e && e.target && ((<HTMLElement>e.target).id === "watch7-container" ||
            ((<HTMLElement>e.target).id === "watch7-main-container"))) {
            // old value: movie_player
            this.renderButton();
        }
    }
}