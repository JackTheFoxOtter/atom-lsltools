'use babel';

import { Directory, File } from 'atom';

export default class AtomLsltoolsPreprocessor {

    constructor(main) {
        this.main = main;

        // Processors are divided into 3 groups:
        // 1. Language extending processors
        //      Translates custom, abstract syntax into official, compilable code.
        //      Useful to add new code features.
        //      Input: Code with custom syntax, non-compilable
        //      Output: Code with official syntax, compilable
        // 2. Script altering processors
        //      Translates compilable code into a different version of the compilable code while maintaining semantic.
        //      Useful for converting easy but inefficient code into more complicated but also more performant code.
        //      Input: Code with official syntax, compilable
        //      Output: Code with official syntax, compilable
        // 3. Output altering processors
        //      Modifies the script output while not influencing code execution.
        //      Useful for appending annotations or compacting code.
        //      Input: Code with official syntax, compilable
        //      Output: Code with official syntax, compilable
        this.processors = [];

        // Register processors
        this.processors.push(this.processorTimestamp);
    }

    // Takes the file at source and pre-processes it before writing it to destination.
	// Calls callback with the destination file path after completition.
	preprocess(filePaths, callback) {
        if (filePaths['path_absolute_source'] === undefined) {
            atom.notifications.addWarning("Can't preprocess - Path to source file is undefined!");
            return;
        } else if (filePaths['path_absolute_processed'] === undefined) {
            atom.notifications.addWarning("Can't preprocess - Path to destination file is undefined!");
            return;
        }

		this.main.console_print("LSL Tools", `Preprocessing '${filePaths['path_relative']}'...`);
		var fileSource = new File(filePaths['path_absolute_source']);
		fileSource.read().then((content) => {
			// Apply each processor in order
			this.processors.forEach((processor) => {
				content = processor(content);
			});

			// Write the file and call callback
			var fileDestination = new File(filePaths['path_absolute_processed']);
            fileDestination.create().then(() => {
                fileDestination.write(content).then(() => {
    				this.main.console_print("LSL Tools", `Preprocessed '${filePaths['path_relative']}'.`);
    				callback();
    			});
            });
		});
	}

    // ====================================================================================================================
    // ---------------------------------------[BUILD IN PREPROCESSORS]-----------------------------------------------------
    // ====================================================================================================================

    processorTimestamp(fileContent) {
        // Test preprocessor
        var date = new Date();
        return `// Generated on ${date.toString()}\n${fileContent}`;
    };
};
