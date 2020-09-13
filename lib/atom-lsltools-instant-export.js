'use babel';

import LSLToolsInstantExportView from './views/atom-lsltools-instant-export-view';
import { CompositeDisposable, Directory, File } from 'atom';

let myself;

export default class LSLToolsInstantExport {

    constructor(main, state) {
        myself = this;
        myself.main = main;

        myself.instantExportView = new LSLToolsInstantExportView(myself, state.lsltoolsInstantExportViewState);
        myself.instantExportPanel = atom.workspace.addModalPanel({
			item: myself.instantExportView.getElement(),
			visible: false
		});
    }

    serializeView() {
        return { lsltoolsInstantExportViewState: myself.instantExportView.serialize() };
    }

    deactivate() {
        myself.instantExportView.destroy();
        myself.instantExportPanel.destroy();
    }

    // Try to export the active editor's compiled script
    // Called by menu bar
    // Called by right-click into editor
    exportEditorActive() {
        if (myself.main.activeTextEditor === undefined) {
            atom.notifications.addWarning("Can't export - No active editor.");
        } else {
            myself.export(myself.main.activeTextEditor.getPath());
        }
    }

    // Prepare export of the selected script (or it's compiled version)
    async export(sourcePath) {
        // Make sure a user is selected. (This way we know what inv.gz file we should look into to find the name for the script)
        // var selectedUser;
        // try {
        //     selectedUser = await myself.main.userSelector.getSelectedUser();
        // } catch (error) {
        //     atom.notifications.addWarning("No user selected, export aborted.");
        //     return;
        // }

        // TODO: Compile before export (Probably should not do this here, but eh)
        myself.main.compiler.compile(sourcePath);
        // Determine export target file.
        var scriptPaths = myself.main.utils.determineRelatedPaths(sourcePath);

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
                myself.instantExportPanel.show();
                myself.instantExportView.enter((selectedExportTarget) => {
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
                                        myself.main.console.print("LSL Tools", `Exported '${scriptPaths['path_relative']}' -> '${selectedExportTarget.getBaseName()}'`);
                                    });
                                }
                            });
                        }
                    });
                    myself.instantExportPanel.hide();
                }, () => {
                    // Cancelled callback
                    myself.instantExportPanel.hide();
                });
            }
        });
    }
};
