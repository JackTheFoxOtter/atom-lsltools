'use babel';

export default class AtomLsltoolsProjectSelectorView {

    constructor(serializedState) {
        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('tool-panel', 'atom-lsltools-project-selector');

        // Create headline
        const headline = document.createElement('div');
        headline.textContent = 'Select a project';
        headline.classList.add('atom-lsltools-project-selector-headline');
        this.element.appendChild(headline);

        // Cancel button
        const btn_cancel = document.createElement('button');
        btn_cancel.id = 'atom-lsltools-project-selector-cancel-button';
        btn_cancel.innerHTML = "Cancel";
        headline.appendChild(btn_cancel);

        // Create content wrapper
        const content_wrapper = document.createElement('div');
        content_wrapper.classList.add('atom-lsltools-project-selector-content-wrapper');
        this.element.appendChild(content_wrapper)

        // Create content container
        const content = document.createElement('div');
        content.id = "atom-lsltools-project-selector-content";
        content.classList.add('atom-lsltools-project-selector-content');
        content_wrapper.appendChild(content);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {}

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    getElement() {
        return this.element;
    }

    init(options, callback_selected, callback_cancelled) {
        // Set cancel button callback
        btn_cancel = document.getElementById('atom-lsltools-project-selector-cancel-button');
        btn_cancel.onclick = function() { callback_cancelled(); };

        // Remove possible old option buttons
        content = document.getElementById('atom-lsltools-project-selector-content');
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }

        // Add new option buttons + callbacks
        options.forEach(function(option) {
            optionButton = document.createElement('button');
            optionButton.innerHTML = option;
            optionButton.onclick = function() { callback_selected(option); };
            content.appendChild(optionButton);
        });
    }
}
