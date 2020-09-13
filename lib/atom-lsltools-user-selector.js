'use babel';

import LSLToolsUserSelectorView from './views/atom-lsltools-user-selector-view';

let myself;

export default class LSLToolsUserSelector {

    constructor(main, state) {
        myself = this;
        myself.main = main;
        myself.selectedUser = null;

		myself.userSelectorView = new LSLToolsUserSelectorView(myself, state.lsltoolsUserSelectorViewState);
        myself.userSelectorPanel = atom.workspace.addModalPanel({
			item: myself.userSelectorView.getElement(),
			visible: false
		});
    }

    serializeView() {
        return { lsltoolsUserSelectorViewState: myself.userSelectorView.serialize() };
    }

    deactivate() {
        myself.userSelectorView.destroy();
        myself.userSelectorPanel.destroy();
    }

    // Change visibility of modal
    // Call with no parameter to toggle state or with True/False to set explicitly
    toggle(state) {
        if (state === undefined)
            return (myself.userSelectorPanel.isVisible() ? myself.userSelectorPanel.hide() : myself.userSelectorPanel.show());
        else
            return (state ? myself.userSelectorPanel.show() : myself.userSelectorPanel.hide());
    }

    // Show the modal panel
    // Returns promise which resolves to the uuid of the selected user,
    // or rejects if the cancel button is pressed.
    selectUser() {
        return new Promise((resolve, reject) => {
            myself.userSelectorView.init((selectedOption) => {
                // Callback selected
                myself.toggle(false);
                myself.selectedUser = selectedOption;
                resolve(selectedOption);
            }, () => {
                // Callback cancelled
                myself.toggle(false);
                reject();
            }).then((showMenu) => {
                if (showMenu) myself.toggle(true);
            });
        });
    }

    // Returns currently selected user uuid or a promise resolving to it.
    // In the latter case the select menu will be displayed
    getSelectedUser() {
        if (myself.selectedUser) {
            return myself.selectedUser;
        } else {
            return myself.selectUser();
        }
    }
}
