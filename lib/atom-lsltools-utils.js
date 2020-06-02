'use babel';

import { CompositeDisposable, Directory, File } from 'atom';

let myself;

export default class LSLToolsUtils {

    constructor(main) {
        myself = this;
        this.main = main;
    }

    // Take an InputPath of a file in a currently opened project and determine logically related paths
    determineRelatedPaths(inputPath) {
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
    }

    // Sets up folder setup in active project root.
	// If there are multiple project roots opened, the user gets a promt and has to choose one.
	foldersetup(procectRoot) {
		if (procectRoot === undefined) {
			// Determine project root.
			// If multiple, let user decide!
			var showProjectSelectorPanel = myself.main.projectSelector.projectSelectorView.init(
				(selection) => {
					// Callback selected
					if (selection !== undefined) {
						myself.foldersetup(selection);
					} else {
						atom.notifications.addError('Selected project root is undefined!');
						return;
					}
                    myself.main.projectSelector.toggle(false);
				},
				() => {
					// Callback cancelled
					myself.main.projectSelector.toggle(false);
					return;
				}
			);
			// Show project selector panel if LSLToolsProjectSelectorView.init(...) returned true
			if (showProjectSelectorPanel) myself.main.projectSelector.toggle(true);

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
				if (!dir.existsSync()) dir.create();
			});
		}
	}

    // Returns promise that resolves to the DOM-object of the specified url
	async fetchExternalHtmlContent(url) {
		return new Promise((resolve, reject) => {
			let request = new XMLHttpRequest();
			request.open("GET", url);
			request.onload = () => {
				domParser = new DOMParser();
				resolve(domParser.parseFromString(request.responseText, 'text/html'));
			}
			console.log(`XMLHttpRequest: Fetching html document from external source '${url}'`);
			request.send();
		});
	}

	openKwdbFile(keyword) {
		// Open KWDB, position cursor to line where the searchphrase first appears
		if (keyword) {
			let searchphrase = `name="${keyword}"`;
			let line = 0;
			myself.main.kwdbFile.read(true).then((file_content) => {
				let index = file_content.indexOf(searchphrase);
				if (index > 0) {
					let tempString = file_content.substring(0, index);
					let lines = tempString.split('\n');
					line = lines.length-1;
				}
				atom.workspace.open(atom.config.get('LSL-Tools.pathToKwdbFile'), {'initialLine': line});
			});
		} else {
			atom.workspace.open(atom.config.get('LSL-Tools.pathToKwdbFile'));
		}
	}

	escapeHtml(unsafe) {
	if (!unsafe) return unsafe;
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
 	}
}
