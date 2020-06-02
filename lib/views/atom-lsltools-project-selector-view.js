'use babel';

let myself;

export default class LSLToolsProjectSelectorView {

    constructor(base, serializedState) {
        myself = this;
        myself.base = base;

        // Create root element
        myself.element = document.createElement('div');
        myself.element.classList.add('tool-panel', 'atom-lsltools-project-selector');

        // Create headline
        const headline = document.createElement('div');
        headline.textContent = 'Select a project';
        headline.classList.add('atom-lsltools-project-selector-headline');
        myself.element.appendChild(headline);

        // Cancel button
        const buttonCancel = document.createElement('button');
        buttonCancel.id = 'atom-lsltools-project-selector-cancel-button';
        buttonCancel.innerHTML = "Cancel";
        headline.appendChild(buttonCancel);

        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('atom-lsltools-project-selector-content-wrapper');
        myself.element.appendChild(contentWrapper)

        // Create content container
        const content = document.createElement('div');
        content.id = "atom-lsltools-project-selector-content";
        content.classList.add('atom-lsltools-project-selector-content');
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
    init(callbackSelected, callbackCancelled) {
        // Set cancel button callback
        buttonCancel = document.getElementById('atom-lsltools-project-selector-cancel-button');
        buttonCancel.onclick = () => { callbackCancelled(); };

        // Determine currently opened project roots
        var projectRoots = atom.project.getPaths();
        if (projectRoots.length == 0) {
            // No project roots - nothing to choose
            atom.notifications.addError('No project root(s) found!');
            callbackCancelled();
            return false;
        } else if (projectRoots.length == 1) {
            // Only one project root, only one choice, automate
            callbackSelected(projectRoots[0]);
            return false;
        }

        // Remove possible old option buttons
        content = document.getElementById('atom-lsltools-project-selector-content');
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }

        // Add new option buttons + callbacks
        projectRoots.forEach((option) => {
            optionButton = document.createElement('button');
            optionButton.innerHTML = option;
            optionButton.onclick = () => { callbackSelected(option); };
            content.appendChild(optionButton);
        });

        return true;
    }
}
