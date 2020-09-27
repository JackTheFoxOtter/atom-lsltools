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

		myself.main.preprocessor.preprocess(scriptPaths, (lineNumberMapping) => {
			// Do the actual call of the compiler here
			atom.notifications.addInfo("Attempting to compile...");
			var pathToCompiler = atom.config.get("LSL-Tools.pathToCompiler");
			var compiler = new File(pathToCompiler)
			if (!compiler.existsSync()) {
				// Compiler executable does not exist
				if (pathToCompiler.length > 0 ) {
					atom.notifications.addWarning("Compiler executable could not be found!");
					myself.main.console.print("LSL Compiler", `Compiler '${pathToCompiler}' not found! Check compiler path in settings.`, '§orange');
				} else {
					atom.notifications.addWarning("No compiler executable specified!");
					myself.main.console.print("LSL Compiler", "No compiler executable specified! Check compiler path in settings.", '§orange');
				}
				return;
			}

			myself.main.console.print("LSL Compiler", `Compiling '${scriptPaths['path_absolute_processed']}'...`);
			var errorCount = 0;
			var child = require('child_process').execFile(
                pathToCompiler,
                [scriptPaths['path_absolute_processed']],
                (error, stdout, stderr) => {
                    if (error) {
                        // Something went wrong with the actual executable call.
                        myself.main.console.print("LSL Compiler", "(Critical)", error.toString(), '§red');
                        errorCount++;
                    }
            });

            child.on('error', (error) => {
                myself.main.console.print("LSL Compiler", error.toString(), '§red');
                errorCount++;
            });

            child.stderr.on('data', (data) => {
                // Error output from LSLComp executable
                if (!data) return;

                var str = data.toString();
                // Searches for '(<Number1>, <Number2>)' at the beginning of the string
                var matches = str.match(/^\((\d*), (\d*)\)/);
                if (matches) {
                    // Exact position of error specified, print error to console
                    myself.main.console.print("LSL Compiler",
                        `Line ${lineNumberMapping[matches[1]]}`,
                        `$${matches[0]} in processed output (ctrl + click)`,
                        (mouseEvent) => {
                            if (mouseEvent.ctrlKey) {
                                // Ctrl + click: Open processed file
                                atom.workspace.open(scriptPaths['path_absolute_processed'],
                                    { 'initialLine': matches[1] - 1, 'initialColumn': matches[2] - 1}
                                );
                            } else {
                                // Normal click: Open source file
                                atom.workspace.open(scriptPaths['path_absolute_source'],
                                    { 'initialLine': lineNumberMapping[matches[1]] - 1 }
                                );
                            }
                        },
                        str.replace(matches[0], "")
                    );
                } else {
                    // No exact position of error specified
                    myself.main.console.print("LSL Compiler", str);
                }
				errorCount++;
			});

            child.stdout.on('data', (data) => {
                // Normal output from LSLComp executable
                if (!data) return;

                myself.main.console.print("LSL Compiler", data.toString());
            });

            let finished = false;
            function onFinish() {
                if (finished) return;
                finished = true;

                if (errorCount == 0) {
					myself.main.console.print("LSL Compiler", "Compilation ", "<b>successful</b>", '§lime', ".");
				} else {
					myself.main.console.print("LSL Compiler", "Compilation ", "<b>failed</b>", '§red', ".");
				}
            }

            child.on('exit', onFinish);
            child.on('close', onFinish);
		});
	}
}
