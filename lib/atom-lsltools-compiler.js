'use babel';

import { File } from 'atom';

export default class LSLToolsCompiler {

    constructor(main) {
        myself = this;
        myself.main = main;
    }

    // Try to compile the active editor's script
	// Called by menu bar
	// Called by right-click into editor
	compileEditorActive() {
		if (myself.main.activeTextEditor === undefined) {
			atom.notifications.addWarning("Can't process - No active text editor.");
		} else {
			myself.main.activeTextEditor.save().then(() => {
				myself.compile(myself.main.activeTextEditor.getPath());
			});
		}
	}

	// Compile the defined source script file
	compile(sourcePath) {
		atom.notifications.addInfo("Attempting to preprocess...");
		var scriptPaths = myself.main.utils.determineRelatedPaths(sourcePath);
		if (scriptPaths['path_absolute_processed'] === undefined) {
			// Something went wrong, no lsl related paths were generated
			atom.notifications.addWarning("Could not determine processed output path! Does a valid LSL folder structure exist?");
			return;
		}

		myself.main.preprocessor.preprocess(scriptPaths, () => {
			// Do the actual call of the compiler here
			atom.notifications.addInfo("Attempting to compile...");
			var pathToCompiler = atom.config.get("LSL-Tools.pathToCompiler");
			var compiler = new File(pathToCompiler)
			if (!compiler.existsSync()) {
				// Compiler executable does not exist
				if (pathToCompiler.length > 0 ) {
					atom.notifications.addWarning("Compiler executable could not be found!");
					myself.main.console.print("LSL Compiler", `Compiler '${pathToCompiler}' not found! Check compiler path in settings.`);
				} else {
					atom.notifications.addWarning("No compiler executable specified!");
					myself.main.console.print("LSL Compiler", "No compiler executable specified! Check compiler path in settings.");
				}
				return;
			}

			myself.main.console.print("LSL Compiler", `Compiling '${scriptPaths['path_absolute_processed']}'...`);
			var errorCount = 0;
			var child = require('child_process').execFile(
                pathToCompiler,
                [scriptPaths['path_absolute_processed']],
                (error, stdout, stderr) => {
                    myself.main.console.print("LSL Compiler", "Critical Error: " + error.toString());
                    errorCount++;
            });

            child.on('error', (error) => {
                myself.main.console.print("LSL Compiler", "Error: " + error.toString());
                errorCount++;
            });

            child.stderr.on('data', (data) => {
                // Error output from LSLComp executable
				myself.main.console.print("LSL Compiler", data.toString());
				errorCount++;
			});

            child.stdout.on('data', (data) => {
                // Normal output from LSLComp executable
                myself.main.console.print("LSL Compiler", data.toString());
            });

            child.on('exit', (code, signal) => {
                if (errorCount == 0) {
					myself.main.console.print("LSL Compiler", "Compilation successful.");
				} else {
					myself.main.console.print("LSL Compiler", "Compilation failed.");
				}
            });
		});
	}
}
