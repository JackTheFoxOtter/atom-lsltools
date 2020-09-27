'use babel';

import LSLToolsConsoleView from './views/atom-lsltools-console-view';

let myself;

export default class LSLToolsConsole {

    constructor(main, state) {
        myself = this;
        myself.main = main;

		myself.consoleView = new LSLToolsConsoleView(myself, state.lsltoolsConsoleViewState);
        myself.consolePanel = atom.workspace.addBottomPanel({
            item: myself.consoleView.getElement(),
            visible: false
        });
    }

    serializeView() {
        return { lsltoolsConsoleViewState: myself.consoleView.serialize() };
    }

    deactivate() {
        myself.consoleView.destroy();
        myself.consolePanel.destroy();
    }

    // Change visibility of console
    // Call with no parameter to toggle state or with True/False to set explicitly
    toggle(state) {
        if (state === undefined)
            return (myself.consolePanel.isVisible() ? myself.consolePanel.hide() : myself.consolePanel.show());
        else
            return (state ? myself.consolePanel.show() : myself.consolePanel.hide());
    }

    // Change console visibility to visible and print message
    print(category, ...msgSegments) {
        myself.toggle(true);
        myself.consoleView.print(category, msgSegments);
    }

    // Change console visibility to visible and print message if condition is true
    printIf(condition, category, ...msgSegments) {
        if ( condition !== undefined && !condition)
            return;

        myself.print(category, ...msgSegments);
    }

    // Clear current console content
    clear() {
        myself.consoleView.clear();
    }
}
