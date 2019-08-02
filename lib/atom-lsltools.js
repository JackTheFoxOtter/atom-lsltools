'use babel';

import AtomLsltoolsConsoleView from './atom-lsltools-console-view';
import AtomLsltoolsProjectSelectorView from './atom-lsltools-project-selector-view';
import AtomLsltoolsInstantExportView from './atom-lsltools-instant-export-view';
import AtomLsltoolsPreprocessor from './atom-lsltools-preprocessor';
import { CompositeDisposable, Directory, File } from 'atom';
import packageConfig from './config-schema.json';

// TODO:
// 2. Save file in current editor before compiling - Otherwise old, unsaved version will be compiled
// 4. Implement treeview features (+Saving file before compiling from tree view!)

export default {
	atomLsltoolsConsoleView: null,
	atomLsltoolsInstantExportView: null,
	atomLsltoolsProjectSelectorView: null,
	consolePanel: null,
	projectSelectorPanel: null,
	config: packageConfig,
	subscriptions: null,
	preprocessor: null,

	activate(state) {
		// Instantiate views
		this.atomLsltoolsConsoleView = new AtomLsltoolsConsoleView(state.atomLsltoolsConsoleViewState);
		this.atomLsltoolsInstantExportView = new AtomLsltoolsInstantExportView(state.atomLsltoolsInstantExportViewState);
		this.atomLsltoolsProjectSelectorView = new AtomLsltoolsProjectSelectorView(state.atomLsltoolsProjectSelectorViewState);

		// Instantiate preprocessor
		this.preprocessor = new AtomLsltoolsPreprocessor(this);

		// Console panel
		this.consolePanel = atom.workspace.addBottomPanel({
			item: this.atomLsltoolsConsoleView.getElement(),
			visible: false
		});

		// Instant export panel
		this.instantExportPanel = atom.workspace.addModalPanel({
			item: this.atomLsltoolsInstantExportView.getElement(),
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
			'atom-lsltools:console_toggle': () => this.console_toggle(),
			'atom-lsltools:console_clear': () => this.atomLsltoolsConsoleView.clear(),
			'atom-lsltools:foldersetup': () => this.foldersetup(),
			'atom-lsltools:compile_editor_active': () => this.compile_editor_active(),
			'atom-lsltools:compile_treeview_selected': () => this.compile_treeview_selected(),
			'atom-lsltools:export_editor_active': () => this.export_editor_active(),
			'atom-lsltools:export_treeview_selected': () => this.export_treeview_selected(),
			'atom-lsltools:test': () => this.test()
		}));
	},

	deactivate() {
		this.subscriptions.dispose();
		this.atomLsltoolsConsoleView.destroy();
		this.atomLsltoolsInstantExportView.destroy();
		this.atomLsltoolsProjectSelectorView.destroy();
		this.consolePanel.destroy();
		this.projectSelectorPanel.destroy();
	},

	serialize() {
		return {
			atomLsltoolsConsoleViewState: this.atomLsltoolsConsoleView.serialize(),
			atomLsltoolsInstantExportViewState: this.atomLsltoolsInstantExportView.serialize(),
			atomLsltoolsProjectSelectorViewState: this.atomLsltoolsProjectSelectorView.serialize()
		};
	},

	// ====================================================================================================================
	// -----------------------------------------------[CONSOLE]------------------------------------------------------------
	// ====================================================================================================================

	// Change visibility of console.
	// Call with no parameter to toggle state
	// if state == true -> show
	// if state == false -> hide
	console_toggle(state) {
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

	// Change console visibility to visible and print message
	console_print(category, text, thisArg) {
		thisArg = thisArg === undefined ? this : thisArg;
		thisArg.console_toggle(true);
		thisArg.atomLsltoolsConsoleView.print(category, text)
	},

	// ====================================================================================================================
	// ---------------------------------------------[FOLDERSETUP]----------------------------------------------------------
	// ====================================================================================================================

	// Sets up folder setup in active project root.
	// If there are multiple project roots opened, the user gets a promt and has to choose one.
	foldersetup(procectRoot) {
		if (procectRoot === undefined) {
			// Determine project root.
			// If multiple, let user decide!
			var showProjectSelectorPanel = this.atomLsltoolsProjectSelectorView.init(
				(selection) => {
					// Callback selected
					if (selection !== undefined) {
						this.foldersetup(selection);
					} else {
						atom.notifications.addError('Selected project root is undefined!');
						return;
					}
					if (this.projectSelectorPanel.isVisible()) this.projectSelectorPanel.hide();
				},
				() => {
					// Callback cancelled
					if (this.projectSelectorPanel.isVisible()) this.projectSelectorPanel.hide();
					return;
				}
			);
			// Show project selector panel if atomLsltoolsProjectSelectorView.init(...) returned true
			if (showProjectSelectorPanel) this.projectSelectorPanel.show();
		} else {
			// Set up the folder structure
			atom.notifications.addInfo(`Setting up LSL folder-structure in project: '${procectRoot}'...`);
			var directoryPaths = [
				procectRoot+"\\.out\\lsl",
				procectRoot+"\\lsl-library",
				procectRoot+"\\lsl-projects"
			]

			directoryPaths.forEach((directoryPath) => {
				var dir = new Directory(directoryPath);
				console.log("Directory: " + dir.getPath());
				if (!dir.existsSync()) { dir.create(); }
			});
		}
	},

	// ====================================================================================================================
	// -----------------------------------------------[COMPILE]------------------------------------------------------------
	// ====================================================================================================================

	// Try to compile the active editor's script
	// Called by menu bar
	// Called by right-click into editor
	compile_editor_active() {
		var activeEditor = atom.workspace.getActiveTextEditor();
		if (activeEditor === undefined) {
			atom.notifications.addWarning("Can't process - No active editor.");
		} else {
			activeEditor.save().then(() => {
				this.compile(activeEditor.getPath());
			});
		}
	},

	// Try to compile the currently selected (or right clicked) treeview-item
	// Called by treeview context menu
	compile_treeview_selected() {
		// ToDo: Support both selected files and folders
	},

	// Compile the defined source script file
	compile(sourcePath) {
		atom.notifications.addInfo("Attempting to compile...");
		var scriptPaths = this.determine_related_paths(sourcePath);
		var pathCompiler = atom.config.get("LSL-Tools.pathToCompiler");

		this.preprocessor.preprocess(scriptPaths, () => {
			// Do the actual call of the compiler here
			this.console_print("LSL Compiler", `Compiling '${scriptPaths['path_absolute_processed']}'...`);
			var messageCount = 0;
			var child = require('child_process').execFile(pathCompiler, [scriptPaths['path_absolute_processed']]);
			child.stderr.on('data', (data) => {
				this.console_print("LSL Compiler", data.toString());
				messageCount++;
			});
			child.on('close', () => {
				if (messageCount == 0) {
					this.console_print("LSL Compiler", "Compilation successful.");
				} else {
					this.console_print("LSL Compiler", "Compilation failed.");
				}
			});
		});
	},

	// ====================================================================================================================
	// ------------------------------------------------[EXPORT]------------------------------------------------------------
	// ====================================================================================================================

	// Try to export the active editor's compiled script
	// Called by menu bar
	// Called by right-click into editor
	export_editor_active() {
		var activeEditor = atom.workspace.getActiveTextEditor();
		if (activeEditor === undefined) {
			atom.notifications.addWarning("Can't export - No active editor.");
		} else {
			this.export(activeEditor.getPath());
		}
	},

	// Try to export the currently selected (or right clicked) treeview-item's compiled script
	// Called by treeview context menu
	export_treeview_selected() {
		// ToDo: Support both selected files and folders
	},

	// Prepare export of the selected script (or it's compiled version)
	export(sourcePath) {
		// Determine export target file.
		var scriptPaths = this.determine_related_paths(sourcePath);

		// If script in /lsl-projects/ is the sourcePath, it's counterpart in /.out/lsl/ will be the export target
		// If script is already in /.out/lsl/ it will be chosen as the export file.
		// Only allows files with '.lsl' suffix.
		var exportFile = new File(scriptPaths['path_absolute_processed']);
		exportFile.exists().then((exportFileExists) => {
			if(!exportFileExists) {
				// Source file doesn't exist
				atom.notifications.addWarning(`Can't export - No output code for '${scriptPaths['path_relative']}' found. (Is it preprocessed yet?)`);
			} else {
				// Source file exists
				this.instantExportPanel.show();
				this.atomLsltoolsInstantExportView.enter((selectedExportTarget) => {
					// Selected callback
					selectedExportTarget.exists().then((selectedExportTargetExists) => {
						if (!selectedExportTargetExists) {
							atom.notifications.addError("Can't export - Selected export file could no longer be found.");
						} else {
							// Actually do the export
							exportFile.read().then((exportFileContent) => {
								if (exportFileContent === null) {
									atom.notifications.addError("Can't export - Export source file no longer exists.");
								} else {
									selectedExportTarget.write(exportFileContent).then(() => {
										this.console_print("LSL Tools", `Exported '${scriptPaths['path_relative']}' -> '${selectedExportTarget.getBaseName()}'`);
									});
								}
							});
						}
					});
					this.instantExportPanel.hide();
				}, () => {
					// Cancelled callback
					this.instantExportPanel.hide();
				});
			}
		});
	},

	// ====================================================================================================================
	// -------------------------------------------------[UTILS]------------------------------------------------------------
	// ====================================================================================================================

	// Take an InputPath of a file in a currently opened project and determine logically related paths
	determine_related_paths(inputPath) {
		var paths = {};

		if (inputPath === undefined) {
			atom.notifications.addWarning("Can't determine related paths - Input path is undefined.");
			return paths;
		}

		// Find out which current project the input path corresponds to
		var projectRoots = atom.project.getPaths();
		projectRoots.forEach((rootPath) => {
			if (inputPath.startsWith(rootPath)) {
				projectRootPath = rootPath;
			}
		});
		if (projectRootPath === undefined) {
			atom.notifications.addWarning("Can't determine related paths - Input path not subset of currently opened project.");
			return paths;
		}
		// Store the determined project's root path
		paths['path_project_root'] = projectRootPath;

		// Find lsl specific paths
		var tmp = inputPath.slice(projectRootPath.length);
		if (tmp.startsWith('\\.out\\lsl')) {
			paths['path_relative'] = tmp.slice('\\.out\\lsl'.length);
			paths['path_relative_source'] = '\\lsl-projects'.concat(paths['path_relative']);
			paths['path_relative_processed'] = tmp;
			paths['path_absolute_source'] = paths['path_project_root'].concat(paths['path_relative_source']);
			paths['path_absolute_processed'] = paths['path_project_root'].concat(paths['path_relative_processed']);
		} else if (tmp.startsWith('\\lsl-projects')) {
			paths['path_relative'] = tmp.slice('\\lsl-projects'.length);
			paths['path_relative_source'] = tmp;
			paths['path_relative_processed'] = '\\.out\\lsl' + paths['path_relative'];
			paths['path_absolute_source'] = paths['path_project_root'].concat(paths['path_relative_source']);
			paths['path_absolute_processed'] = paths['path_project_root'].concat(paths['path_relative_processed']);
		}

		return paths;
	},

	// ====================================================================================================================
	// -------------------------------------------------[DEBUG]------------------------------------------------------------
	// ====================================================================================================================

	test() {
		var activeEditor = atom.workspace.getActiveTextEditor();
		if (activeEditor === undefined) {
			atom.notifications.addWarning("Can't export - No active editor.");
		} else {
			console.log("Input Path: " + activeEditor.getPath());
			console.log(this.determine_related_paths(activeEditor.getPath()));
		}
	}
};
