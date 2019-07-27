'use babel';

import AtomLsltoolsConsoleView from './atom-lsltools-console-view';
import AtomLsltoolsProjectSelectorView from './atom-lsltools-project-selector-view';
import { CompositeDisposable, Directory } from 'atom';
import packageConfig from './config-schema.json';

export default {
	atomLsltoolsConsoleView: null,
	atomLsltoolsProjectSelectorView: null,
	consolePanel: null,
	projectSelectorPanel: null,
	config: packageConfig,
	subscriptions: null,

	activate(state) {
		this.atomLsltoolsConsoleView = new AtomLsltoolsConsoleView(state.atomLsltoolsConsoleViewState);
		this.atomLsltoolsProjectSelectorView = new AtomLsltoolsProjectSelectorView(state.atomLsltoolsProjectSelectorViewState);

		// Console panel
		this.consolePanel = atom.workspace.addBottomPanel({
			item: this.atomLsltoolsConsoleView.getElement(),
			visible: false
		});

		// Project selector panel
		this.projectSelectorPanel = atom.workspace.addModalPanel({
			item: this.atomLsltoolsProjectSelectorView.getElement(),
			visible: false
		});

		// Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
		this.subscriptions = new CompositeDisposable();

		// Register commands
		this.subscriptions.add(atom.commands.add('atom-workspace', {
			'atom-lsltools:console_toggle': () => this.toggle_console(),
			'atom-lsltools:foldersetup': () => this.foldersetup(),
			'atom-lsltools:compile_editor_active': () => this.compile_editor_active(),
			'atom-lsltools:compile_treeview_selected': () => this.compile_treeview_selected(),
			'atom-lsltools:console_test': () => this.console_send("Test", "Console test!"),
			'atom-lsltools:test': () => this.test()
		}));
	},

	deactivate() {
		this.subscriptions.dispose();
		this.atomLsltoolsConsoleView.destroy();
		this.atomLsltoolsProjectSelectorView.destroy();
		this.consolePanel.destroy();
		this.projectSelectorPanel.destroy();
	},

	serialize() {
		return {
			atomLsltoolsConsoleViewState: this.atomLsltoolsConsoleView.serialize(),
			atomLsltoolsProjectSelectorViewState: this.atomLsltoolsProjectSelectorView.serialize()
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
		while (contentElement.childElementCount > 100) {
			contentElement.removeChild(contentElement.firstChild);
		}
	},

	// Sets up folder setup in active project root.
	// If there are multiple project roots opened, the user gets a promt and has to choose one.
	foldersetup(project_root) {
		if (project_root === undefined) {
			// Determine the current/user chosen project root
			project_roots = atom.project.getPaths();

			if (project_roots.length == 0) {
				atom.notifications.addError('No project root(s) found!');
				return;
			} else if (project_roots.length == 1) {
				if (project_roots[0] !== undefined) this.foldersetup(project_roots[0]);
			} else {
				// Let the user choose the project root
				main = this;
				this.atomLsltoolsProjectSelectorView.init(
					//Pass the options
					project_roots,
					//["A", "B", "C", "D", "E", "F", "G"],
					function(option) {
						// Callback selected
						if (option !== undefined) main.foldersetup(option);
						main.projectSelectorPanel.hide();
					},
					function() {
						// Callback cancelled
						main.projectSelectorPanel.hide();
						return;
					}
				);
				this.projectSelectorPanel.show();
			}
		} else {
			// Set up the folder structure
			atom.notifications.addInfo(`Setting up LSL folder-structure in project: '${project_root}'...`);
			directory_paths = [
				project_root+"\\.out\\lsl",
				project_root+"\\lsl-library",
				project_root+"\\lsl-projects"
			]

			directory_paths.forEach(function(directory_path) {
				dir = new Directory(directory_path);
				console.log("Directory: " + dir.getPath());
				if (!dir.existsSync()) { dir.create(); };
			});
		}
	},

	// Try to compile the active editor's script
	// Called by menu bar
	// Called by right-click into editor
	compile_editor_active() {
		activeEditor = atom.workspace.getActiveTextEditor();
		if (activeEditor === undefined) {
			atom.notifications.addWarning("Can't compile - No active editor.");
		} else {
			this.compile(activeEditor.getPath());
		}
	},

	// Try to compile the currently selected (or right clicked) treeview-item
	// Called by treeview context menu
	compile_treeview_selected() {
		// ToDo: Support both selected files and folders
	},

	// Called once the path to the file is determined
	compile(path) {
		if (path === undefined) {
			atom.notifications.addWarning("Can't compile - No file path.");
		} else {
			atom.notifications.addInfo(`Compiling '${path}'...`);
		}
	},

	test() {
		this.foldersetup();
	}
};
