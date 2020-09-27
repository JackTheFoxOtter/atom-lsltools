'use babel';

let myself;

export default class LSLToolsConsoleView {

    constructor(base, serializedState) {
        myself = this;
        myself.base = base;

        // Create root element
        this.element = document.createElement('div');
        this.element.classList.add('tool-panel', 'atom-lsltools-console');

        // Create headline
        const headline = document.createElement('div');
        headline.textContent = 'LSL Tools - Console';
        headline.classList.add('atom-lsltools-console-headline');
        this.element.appendChild(headline);

        // Hide button
        const buttonHide = document.createElement('button');
        buttonHide.innerHTML = "Hide";
        buttonHide.onclick = function() {
            atom.commands.dispatch(this, 'atom-lsltools:console_toggle');
        };
        headline.appendChild(buttonHide);

        // Clear button
        const buttonClear = document.createElement('button');
        buttonClear.innerHTML = "Clear";
        buttonClear.onclick = function() {
            atom.commands.dispatch(this, 'atom-lsltools:console_clear');
        };
        headline.appendChild(buttonClear);

        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.id = "lsltools-console-content-wrapper";
        contentWrapper.classList.add('atom-lsltools-console-content-wrapper');
        this.element.appendChild(contentWrapper)

        // Create content container
        const content = document.createElement('div');
        content.id = "lsltools-console-content";
        content.classList.add('atom-lsltools-console-content');
        contentWrapper.appendChild(content);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {

    }

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    // Return this view's root element
    getElement() {
        return this.element;
    }

    // Print a message to the console
    print(category, segments) {
        var contentElement = document.getElementById("lsltools-console-content");
        var wrapperElement = document.getElementById("lsltools-console-content-wrapper");

        // Determine what scroll value is the maximum and wether or not it is already set
        var maxScrollTop = contentElement.offsetHeight - wrapperElement.offsetHeight;
        var sticky = wrapperElement.scrollTop === maxScrollTop;

        // Create the new line
        var line = document.createElement('div');

        // Add Category stamp
        segments.unshift('§lightsteelblue');
        segments.unshift(`[${category}] `);

        // Add timestamp
        segments.unshift('§lightslategray');
        var date = new Date();
        segments.unshift(
            `${("00"  + date.getHours()).slice(-2)}:` +
            `${("00"  + date.getMinutes()).slice(-2)}:` +
            `${("00"  + date.getSeconds()).slice(-2)}.` +
            `${("000" + date.getMilliseconds()).slice(-3)} `
        );

        // Add actual text segments
        var element = undefined;
        segments.forEach((segment) => {
            if (typeof segment === 'function' && element) {
                // Function, turn previous element into link with this function as onclick event
                link = document.createElement('a');
                link.onclick = segment;
                element.parentNode.insertBefore(link, element);
                link.appendChild(element);
            } else if (typeof segment === 'string' || segment instanceof String) {
                if (segment.startsWith('§') && element) {
                    // Parse as color instruction
                    element.style.color = segment.slice(1);
                } else if (segment.startsWith('$') && element) {
                    // Parse as hover hint
                    element.title = segment.slice(1);
                } else {
                    // Add paragraph component with segment as raw html content
                    element = document.createElement('p');
                    element.style.display = 'inline';
                    element.innerHTML = (`${segment}`);
                    line.appendChild(element)
                }
            }
        });

        // Append constructed line to console content
        contentElement.appendChild(line);

        // Remove old messages after a while
        while (contentElement.childElementCount > 100) {
            contentElement.removeChild(contentElement.firstChild);
        }

        // If it was already scrolled to the maximum value, jump onto the maximum value again. (Autoscroll)
        if (sticky) {
            maxScrollTop = contentElement.offsetHeight - wrapperElement.offsetHeight;
            wrapperElement.scrollTop = maxScrollTop;
        }
    }

    // Clear the console
    clear() {
        var contentElement = document.getElementById("lsltools-console-content");

        // Remove all messages
        while (contentElement.childElementCount > 0) {
            contentElement.removeChild(contentElement.firstChild);
        }
    }
}
