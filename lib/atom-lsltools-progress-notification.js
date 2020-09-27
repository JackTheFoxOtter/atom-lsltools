'use babel';

let myself;

export default class LSLToolsProgressNotification {

    constructor(intial_text) {
        myself = this;

        myself.notification = atom.notifications.addInfo(intial_text, {'dismissable': true, 'icon': 'hourglass'});
        myself.notificationDom = document.querySelector("atom-notification.info.icon.icon-hourglass.has-close > div.content");
        myself.notificationMessageDom = myself.notificationDom.querySelector("div.message.item");

        myself.progressBarContainerDom = document.createElement("div");
        myself.progressBarContainerDom.classList.add("lsltools-notification-progress-bar-container");

        myself.spacer = document.createElement("div");
        myself.spacer.classList.add("lsltools-notification-progress-bar-spacer");

        myself.progressBarDom = document.createElement("div");
        myself.progressBarDom.classList.add("lsltools-notification-progress-bar");
        myself.progressBarDom.style.width = `0%`;

        myself.notificationDom.appendChild(myself.progressBarContainerDom);
        myself.notificationDom.appendChild(myself.spacer);
        myself.progressBarContainerDom.appendChild(myself.progressBarDom);
    }

    // Change the text displayed in the information message.
    setText(new_text) {
        myself.notificationMessageDom.innerHTML = `<p>${new_text}</p>`;
    }

    // Update the progress bar progress. Range 0 - 1.
    // If the progress is 1 or higher, the notification will dismiss itself after 1 second.
    setProgress(progress) {
        myself.progressBarDom.style.width = `${progress*100}%`;
        setTimeout(function() {
            if (progress >= 1.0 && myself.notification) {
                myself.notification.dismiss();
            }
        }, 1000);
    }
}
