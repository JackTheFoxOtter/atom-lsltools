'use babel';

import AtomLsltoolsConsoleView from './atom-lsltools-console-view';
import AtomLsltoolsProjectSelectorView from './atom-lsltools-project-selector-view';
import { CompositeDisposable, Directory, File } from 'atom';
import packageConfig from './config-schema.json';

export default {
	atomLsltoolsConsoleView: null,
	atomLsltoolsProjectSelectorView: null,
	consolePanel: null,
	projectSelectorPanel: null,
	config: packageConfig,
	subscriptions: null,
	preprocessors: [],

	activate(state) {
		this.atomLsltoolsConsoleView = new AtomLsltoolsConsoleView(state.atomLsltoolsConsoleViewState);
		this.atomLsltoolsProjectSelectorView = new AtomLsltoolsProjectSelectorView(state.atomLsltoolsProjectSelectorViewState);

		// Register preprocessors
		this.preprocessors.push(function(file_content) {
			// Test preprocessor
			date = new Date();
			return `// Generated on ${date.toString()}\n${file_content}`;
		});

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
			'atom-lsltools:console_clear': () => this.console_clear(),
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
		line.textContent = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}.${("0" + date.getMilliseconds()).slice(-2)}: [${category}] ${text}`;
		contentElement = this.atomLsltoolsConsoleView.getContentElement();
		contentElement.appendChild(line);

		// Remove old messages after a while
		while (contentElement.childElementCount > 100) {
			contentElement.removeChild(contentElement.firstChild);
		}
	},

	console_clear() {
		contentElement = this.atomLsltoolsConsoleView.getContentElement();
		// Remove all messages
		while (contentElement.childElementCount > 0) {
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
				if (!dir.existsSync()) { dir.create(); }
			});
		}
	},

	// Try to compile the active editor's script
	// Called by menu bar
	// Called by right-click into editor
	compile_editor_active() {
		activeEditor = atom.workspace.getActiveTextEditor();
		if (activeEditor === undefined) {
			atom.notifications.addWarning("Can't process - No active editor.");
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
		atom.notifications.addInfo("Attempting to compile...");
		path_compiler = atom.config.get("LSL-Tools.pathToCompiler");
		main = this;

		this.preprocess(path, function(path_destination, path_source, path_relative) {
			// Do the actual call of the compiler here
			main.console_send("LSL Compiler", `Compiling '${path_destination}'...`);
			count_messages = 0;
			child = require('child_process').execFile(path_compiler, [path_destination]);
			child.stderr.on('data', function(data) {
				main.console_send("LSL Compiler", data.toString());
				count_messages++;
			});
			child.on('close', function() {
				if (count_messages == 0) {
					main.console_send("LSL Compiler", "Compilation successful.");
				} else {
					main.console_send("LSL Compiler", "Compilation failed.");
				}
			});
		});
	},

	// Takes the file at source and pre-processes it before writing it to destination.
	// Calls callback with the destination file path after completition.
	preprocess(path_source, callback) {
		if (path_source === undefined) {
			atom.notifications.addWarning("Can't process - No source file path.");
			return;
		}

		// Try to match path of source file to an active project's lsl-projects folder
		project_roots = atom.project.getPaths();
		project_root = undefined;
		project_roots.forEach(function(root_path) {
			tmp_root_path = root_path + "\\lsl-projects\\";
			if (path_source.startsWith(tmp_root_path)) {
				project_root = root_path;
				return;
			}
		});
		if (project_root === undefined) {
			atom.notifications.addWarning("Can't process - File path not a subset of 'lsl-projects' folder in active project.");
			return;
		}

		// Determine relative path to create pre-processed file
		path_relative = path_source.substring((project_root + "\\lsl-projects\\").length);
		path_destination = project_root+"\\.out\\lsl\\"+path_relative;

		this.console_send("LSL Tools", `Preprocessing '${path_relative}'...`);

		main = this;
		file_source = new File(path_source);
		file_source.read().then(function(file_content) {
			// Apply each preprocessor in order
			main.preprocessors.forEach(function(preprocessor) {
				file_content = preprocessor(file_content);
			});

			// Write the file and call callback with the destination file's path
			file_destination = new File(path_destination);

			//console.log("File destination: \n" + path_destination);
			//console.log("File content: \n" + file_content);

			if (!file_destination.existsSync()) { file_destination.create(); }
			file_destination.write(file_content).then(function() {
				main.console_send("LSL Tools", `Preprocessed '${path_relative}'.`);
				callback(path_destination, path_source, path_relative);
			});
		});
	},

	test() {
		this.compile_editor_active();
	}
};
