'use babel';

import { File } from 'atom';

let myself;

export default class LSLToolsPreprocessor {

    constructor(main) {
        myself = this;
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
            atom.notifications.addWarning("Can't preprocess - Undefined source lsl file!");
            return;
        } else if (filePaths['path_absolute_processed'] === undefined) {
            atom.notifications.addWarning("Can't preprocess - Undefined destination lsl file!");
            return;
        }

		myself.main.console.print("LSL Tools", `Preprocessing '${filePaths['path_relative']}'...`);
		var fileSource = new File(filePaths['path_absolute_source']);
		fileSource.read().then((content) => {
			// Apply each processor in order
			myself.processors.forEach((processor) => {
				content = processor(content);
			});

			// Write the file and call callback
			var fileDestination = new File(filePaths['path_absolute_processed']);
            fileDestination.create().then(() => {
                fileDestination.write(content).then(() => {
    				myself.main.console.print("LSL Tools", `Preprocessed '${filePaths['path_relative']}'.`);
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

    // TODO: preprocessor for better list operations (list[index [, type]] instead of llList2<Type>, pythonic list operations (list[index1:indexn] to get sub-list, del list[index] or del list[index1:indexn]))
};
