'use babel';

import AtomLsltoolsConsoleView from './atom-lsltools-console-view';
import { CompositeDisposable } from 'atom';

export default {
	atomLsltoolsConsoleView: null,
	modalPanel: null, //Example modal panel
	consolePanel: null, //Console panel
	subscriptions: null,

	activate(state) {
		this.atomLsltoolsConsoleView = new AtomLsltoolsConsoleView(state.atomLsltoolsConsoleViewState);

		// Console panel
		this.consolePanel = atom.workspace.addBottomPanel({
			item: this.atomLsltoolsConsoleView.getElement(),
			visible: false
		});

		// Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
		this.subscriptions = new CompositeDisposable();

		// Register command that toggles this view
		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'atom-lsltools:console_toggle': () => this.toggle_console(),
			'atom-lsltools:console_test': () => this.console_send("Test", "Console test!")
		}));
	},

	deactivate() {
		this.modalPanel.destroy(); //Example modal panel
		this.consolePanel.destroy(); //Console panel
		this.subscriptions.dispose();
		this.atomLsltoolsView.destroy();
		this.atomLsltoolsConsoleView.destroy();
	},

	serialize() {
		return {
			atomLsltoolsViewState: this.atomLsltoolsView.serialize(),
			atomLsltoolsConsoleViewState: this.atomLsltoolsConsoleView.serialize()
		};
	},

	// Call with no parameter to toggle state
	// if state == true -> show
	// if state == false -> hide
	toggle_console(state) {
		if (state === undefined){
			return (this.consolePanel.isVisible() ? this.consolePanel.hide() : this.consolePanel.show());
		} else {
			if (state) {
				return (this.consolePanel.show());
			} else {
				return (this.consolePanel.hide());
			}
		}
	},

	console_send(category, text) {
		this.toggle_console(true);
		line = document.createElement('div');

		date = new Date();
		line.textContent = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}: [${category}] ${text}`;
		contentElement = this.atomLsltoolsConsoleView.getContentElement();
		contentElement.appendChild(line);

		// Remove old messages after a while
		if (contentElement.childElementCount > 100) {
			contentElement.removeChild(contentElement.children[0]);
		}
	}
};
