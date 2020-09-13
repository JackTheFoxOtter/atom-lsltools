'use babel';

import { Directory, File } from 'atom';

let myself;

export default class LSLToolsUserSelectorView {

    constructor(base, serializedState) {
        myself = this;
        myself.base = base;

        // Create root element
        myself.element = document.createElement('div');
        myself.element.classList.add('tool-panel', 'atom-lsltools-user-selector');

        // Create headline
        const headline = document.createElement('div');
        headline.textContent = 'Select a user';
        headline.classList.add('atom-lsltools-user-selector-headline');
        myself.element.appendChild(headline);

        // Cancel button
        const buttonCancel = document.createElement('button');
        buttonCancel.id = 'atom-lsltools-user-selector-cancel-button';
        buttonCancel.innerHTML = "Cancel";
        headline.appendChild(buttonCancel);

        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('atom-lsltools-user-selector-content-wrapper');
        myself.element.appendChild(contentWrapper)

        // Create content container
        const content = document.createElement('div');
        content.id = "atom-lsltools-user-selector-content";
        content.classList.add('atom-lsltools-user-selector-content');
        contentWrapper.appendChild(content);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {

    }

    // Tear down any state and detach
    destroy() {
        myself.element.remove();
    }

    // Return this view's root element
    getElement() {
        return myself.element;
    }

    // Initializes view, delivers options to display, defines callbacks
    // Return true if menu should be displayed, return false if not
    async init(callbackSelected, callbackCancelled) {
        // Set cancel button callback
        buttonCancel = document.getElementById('atom-lsltools-user-selector-cancel-button');
        buttonCancel.onclick = () => { callbackCancelled(); };

        // Look for <uuid>.inv.gz files in viewer cache, create list of each user (uuid)
        var choices = [];
        var directoryPath = atom.config.get("LSL-Tools.pathToViewerCacheFolder");
        var directory = new Directory(directoryPath);
        directory.getEntriesSync().forEach((entry) => {
            if (entry.isFile() && entry.getBaseName().endsWith(".inv.gz")) {
                choices.push(entry.getBaseName().slice(0, -7));
            }
        });

        if (choices.length == 0) {
            // No users - nothing to choose
            atom.notifications.addError('No viewer users found! (Cache folder specified correctly?)');
            callbackCancelled();
            return false;
        } else if (choices.length == 1) {
            // Only one user, only one choice, automate
            callbackSelected(choices[0]);
            return false;
        }

        // Remove possible old option buttons
        var content = document.getElementById('atom-lsltools-user-selector-content');
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }

        // Add new option buttons + callbacks for each user (uuid)
        await myself.base.main.utils.asyncForEach(choices, async (choice) => {
            var userID = choice;
            var userName = await myself.base.main.utils.getSLNameForUUID(userID);

            var optionButton = document.createElement('button');
            optionButton.innerHTML = userName;
            optionButton.onclick = () => { callbackSelected(userID); };
            content.appendChild(optionButton);
        });

        return true;
    }
}
