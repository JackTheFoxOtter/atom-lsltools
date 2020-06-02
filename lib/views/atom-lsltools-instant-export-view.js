'use babel';

import { Directory, File } from 'atom';

let myself;

export default class LSLToolsInstantExportView {

    constructor(base, serializedState) {
        myself = this;
        myself.base = base;

        // Create root element
        myself.element = document.createElement('div');
        myself.element.classList.add('tool-panel', 'atom-lsltools-instant-export');

        // Create headline
        const headline = document.createElement('div');
        headline.textContent = 'Export to viewer';
        headline.classList.add('atom-lsltools-instant-export-headline');
        myself.element.appendChild(headline);

        // Cancel button
        const buttonCancel = document.createElement('button');
        buttonCancel.id = 'atom-lsltools-instant-export-cancel-button';
        buttonCancel.innerHTML = "Cancel";
        buttonCancel.onclick = () => { myself.cancelled(); };
        headline.appendChild(buttonCancel);

        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('atom-lsltools-instant-export-content-wrapper');
        myself.element.appendChild(contentWrapper)

        // Create content container
        const content = document.createElement('div');
        content.id = "atom-lsltools-instant-export-content";
        content.classList.add('atom-lsltools-instant-export-content');
        contentWrapper.appendChild(content);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {

    }

    // Tear down any state and detach
    destroy() {
        exit();
        myself.element.remove();
    }

    // Return this view's root element
    getElement() {
        return myself.element;
    }

    // Scans the given directory for temporary viewer lsl files
    scanDirectory(directory) {
        directory.getEntries((error, entries) => {
            if (error === null) {
                files = [];
                entries.forEach((entry) => {
                    if (entry.isFile()) {
                        if (entry.getBaseName().startsWith("sl_script_")) {
                            files.push(entry);
                        }
                    }
                });
                myself.updateButtons(files);
            }
        });
    }

    // Create buttons for each file specified in files and attach update listeners
    updateButtons(files) {
        // Remove possible old option buttons
        content = document.getElementById('atom-lsltools-instant-export-content');
        myself.clearButtons();

        // Add new option buttons + callbacks
        files.forEach((file) => {
            var optionButton = document.createElement('button');
            myself.setScriptElementLabel(file, optionButton);
            optionButton.onclick = () => { myself.selected(file); };
            optionButton.onDidChangeDisposable = file.onDidChange(() => { myself.setScriptElementLabel(file, optionButton); });
            content.appendChild(optionButton);
        });
    }

    // Remove all current buttons and their listeners
    clearButtons() {
        content = document.getElementById('atom-lsltools-instant-export-content');
        while (content.firstChild) {
            if (content.firstChild.onDidChangeDisposable !== undefined) {
                content.firstChild.onDidChangeDisposable.dispose();
            }
            content.removeChild(content.firstChild);
        }
    }

    // Searches the file corresponding to the button for a "name" metadata tag and sets it's innerHTML-value to it.
    // If not found, it uses the file-name without the extension.
    // Additionally, the full file name is appended as a div
    setScriptElementLabel(file, element) {
        myself.getScriptAttributes(file, (attributes) => {
            if (attributes !== undefined && attributes['meta'] !== undefined && attributes['meta']['name'] !== undefined) {
                element.innerHTML = attributes['meta']['name'];
            } else {
                element.innerHTML = file.getBaseName().slice(0, -4);
            }

            // Set sublabel
            var subLabel = document.createElement('div');
            subLabel.innerHTML = file.getPath();
            element.appendChild(subLabel);
        });

    }

    // Scans the file for tags and returns an object datastructure containing them.
    // Format: '//# [<group>: {<key1>:<val1>...}]' -> '{<group>:{<key1>:<val1>, ...}}'
    getScriptAttributes(file, callback) {
        file.read().then((value) => {
            if (value !== null) {
                attributes = {};

                // Try to determine script name from metadata tag
                regex = /\/\/#\s*\[\s*([a-zA-Z_]*)\s*:\s*(.*)\s*\]/;
                matches = value.match(regex);
                if (matches !== null) {
                    for (i = 1; i < matches.length; i+=2) {
                        key = matches[i];
                        value = matches[i+1];

                        if (!(key in attributes)) {
                            attributes[key] = {};
                        }

                        try {
                            Object.assign(attributes[key], JSON.parse(value));
                        } catch(except) {
                            console.log(except);
                        }
                    }
                }

                callback(attributes);
            } else {
                callback(undefined);
            }
        });
    }

    // Entry, defines callbacks from parameters and directory onChange-listener
    // Additionally triggers first directory scan manually.
    enter(callbackSelected, callbackCancelled) {
        myself.callbackCancelled = () => { callbackCancelled(); };
        myself.callbackSelected = (selection) => { callbackSelected(selection); };

        var path_dir = atom.config.get("LSL-Tools.pathToViewerTempFolder");
        var dir = new Directory(path_dir);

        if (myself.dirOnChangeDisposable === undefined) {
            myself.dirOnChangeDisposable = dir.onDidChange(() => {
                myself.scanDirectory(dir);
            });
        }

        myself.scanDirectory(dir);
    }

    // Exit, removes button (and therefore their update listeners) and directory onChange-listener.
    exit() {
        myself.clearButtons();
        if (myself.dirOnChangeDisposable !== undefined) {
            myself.dirOnChangeDisposable.dispose();
            delete myself.dirOnChangeDisposable;
        }
    }

    // Called by cancel button onclick
    cancelled() {
        myself.base.main.console.print("Cancelled export view!");
        myself.exit();
        myself.callbackCancelled();
    }

    // Called by option button onclick
    selected(file) {
        myself.exit();
        myself.callbackSelected(file);
    }
}
