'use babel';

import LSLToolsProjectSelectorView from './views/atom-lsltools-project-selector-view';

let myself;

export default class LSLToolsProjectSelector {
    // TODO: Overwork this!

    constructor(main, state) {
        myself = this;
        myself.main = main;

		myself.projectSelectorView = new LSLToolsProjectSelectorView(myself, state.lsltoolsProjectSelectorViewState);
        myself.projectSelectorPanel = atom.workspace.addModalPanel({
			item: myself.projectSelectorView.getElement(),
			visible: false
		});
    }

    serializeView() {
        return { lsltoolsProjectSelectorViewState: myself.projectSelectorView.serialize() };
    }

    deactivate() {
        myself.projectSelectorView.destroy();
        myself.projectSelectorPanel.destroy();
    }

    // Change visibility of console
    // Call with no parameter to toggle state or with True/False to set explicitly
    toggle(state) {
        if (state === undefined)
            return (myself.projectSelectorPanel.isVisible() ? myself.projectSelectorPanel.hide() : myself.projectSelectorPanel.show());
        else
            return (state ? myself.projectSelectorPanel.show() : myself.projectSelectorPanel.hide());
    }

    init(callbackSelected, callbackCancelled) {
        return myself.projectSelectorView.init(callbackSelected, callbackCancelled);
    }
}
