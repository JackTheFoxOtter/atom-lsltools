'use babel';

import packageConfig from './config/config-schema.json';
import { CompositeDisposable } from 'atom';
import LSLToolsConsole from './atom-lsltools-console';
import LSLToolsProjectSelector from './atom-lsltools-project-selector';
import LSLToolsUserSelector from './atom-lsltools-user-selector';
import LSLToolsInstantExport from './atom-lsltools-instant-export';
import LSLToolsContextDocumentation from './atom-lsltools-context-documentation';
import LSLToolsPreprocessor from './atom-lsltools-preprocessor';
import LSLToolsCompiler from './atom-lsltools-compiler';
import LSLToolsFileIO from './atom-lsltools-file-io';
import LSLToolsUtils from './atom-lsltools-utils';
import LsltoolsProgressNotification from './atom-lsltools-progress-notification';

let myself;
let debugEvents = true;
let debugKeepOverlayOnCursorMove = false;
let debugThrowContextDocumentationErrors = true;

export default {
	config: packageConfig,
	subscriptions: null,
	console: null,
	projectSelector: null,
	userSelector: null,
	instantExport: null,
	contextDocumentation: null,
	preprocessor: null,
	compiler: null,
	fileIO: null,
	utils: null,

	kwdbFile: null,
	kwdbDom: null,
	slwikiCacheFile: null,
	slwikiCacheDom: null,
	activeTextEditor: null,

	activeTextEditorChangedEventSubscription: null,
	cursorPositionChangedEventSubscription: null,

	activate(state) {
		// Store reference to this so we can still use it in anonymous functions where the scope is different
		myself = this;

		myself.console = new LSLToolsConsole(myself, state);
		myself.projectSelector = new LSLToolsProjectSelector(myself, state);
		myself.userSelector = new LSLToolsUserSelector(myself, state);
		myself.instantExport = new LSLToolsInstantExport(myself, state);
		myself.contextDocumentation = new LSLToolsContextDocumentation(myself, state);
		myself.preprocessor = new LSLToolsPreprocessor(myself);
		myself.compiler = new LSLToolsCompiler(myself);
		myself.fileIO = new LSLToolsFileIO(myself);
		myself.utils = new LSLToolsUtils(myself);

		// Register commands
		// Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
		myself.subscriptions = new CompositeDisposable();
		myself.subscriptions.add(atom.commands.add('atom-workspace', {
			'atom-lsltools:reload_external_assets': () => myself.loadExternalAssets(),
			'atom-lsltools:console_toggle': () => myself.console.toggle(),
			'atom-lsltools:console_clear': () => myself.console.clear(),
			'atom-lsltools:foldersetup': () => myself.utils.foldersetup(),
			'atom-lsltools:compile_editor_active': () => myself.compiler.compileEditorActive(),
			//'atom-lsltools:compile_treeview_selected': () => myself.compiler.compile_treeview_selected(),
			'atom-lsltools:export_editor_active': () => myself.instantExport.exportEditorActive(),
			//'atom-lsltools:export_treeview_selected': () => myself.instantExport.export_treeview_selected(),
			'atom.lsltools:switch_user': () => myself.userSelector.selectUser(),
			'atom-lsltools:context_documentation': () => myself.contextDocumentation.process(),
			'atom-lsltools:test': () => myself.test()
		}));

		// Subscribe to editorChanged-event
		activeTextEditorChangedEventSubscription = atom.workspace.onDidChangeActiveTextEditor((editor) => { myself.onActiveTextEditorChanged(editor); });
		myself.console.printIf(debugEvents, "Event", "Subscription => onActiveTextEditorChanged");
		myself.onActiveTextEditorChanged(atom.workspace.getActiveTextEditor()); // Call manually first time

		// Load KWDB.xml
		myself.loadExternalAssets();
	},

	deactivate() {
		// TODO: Look into this and make sure every component gets properly disposed on deactivate
		myself.subscriptions.dispose();
		myself.lsltoolsContextDocumentationView.destroy();
		if (myself.activeTextEditorChangedEventSubscription) { myself.activeTextEditorChangedEventSubscription.dispose(); }
		if (myself.cursorPositionChangedEventSubscription) { myself.cursorPositionChangedEventSubscription.dispose(); }
		myself.contextDocumentation.destroyContextDocumentationOverlay();
	},

	serialize() {
		return {
			...myself.console.serializeView(),
			...myself.projectSelector.serializeView(),
			...myself.userSelector.serializeView(),
			...myself.instantExport.serializeView(),
			...myself.contextDocumentation.serializeView()
		};
	},

	// ====================================================================================================================
	// --------------------------------------------[EXTERNAL ASSETS]-------------------------------------------------------
	// ====================================================================================================================

	loadExternalAssets() {
		xmlSignature = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><cache></cache>`;

		// Load local keyword definition file
		// TODO

		// Load kwdb
		atom.notifications.addInfo(`Loading KWDB file...`);
		myself.fileIO.loadAndParseXMLFile(atom.config.get('LSL-Tools.pathToKwdbFile'), "KWDB file", false).then((kwdb) => {
			myself.kwdbFile = kwdb.file;
			myself.kwdbDom = kwdb.dom;
		});

		// Load slwiki cache file
		atom.notifications.addInfo(`Loading SLWiki cache file...`);
		myself.fileIO.loadAndParseXMLFile(atom.config.get('LSL-Tools.pathToSLWikiCacheFile'), "SLWiki cache file", true, xmlSignature).then((slwikiCache) => {
			myself.slwikiCacheFile = slwikiCache.file;
			myself.slwikiCacheDom = slwikiCache.dom;
		});
	},

	// ====================================================================================================================
	// -------------------------------------------------[DEBUG]------------------------------------------------------------
	// ====================================================================================================================

	test() {

	},

	// ====================================================================================================================
	// -------------------------------------------------[EVENTS]-----------------------------------------------------------
	//=====================================================================================================================

	onActiveTextEditorChanged(editor) {
		// Argument editor - The (new) active text editor or undefined
		myself.console.printIf(debugEvents, "Event", "Active editor changed");
		myself.activeTextEditor = editor;

		// Register cursorPositionChanged-Event to new text editor
		if (myself.cursorPositionChangedEventSubscription) { myself.cursorPositionChangedEventSubscription.dispose(); }
		if (editor !== undefined) {
			myself.cursorPositionChangedEventSubscription = editor.onDidChangeCursorPosition((event) => { myself.onCursorPositionChanged(event); });
			myself.console.printIf(debugEvents, "Event", "Subscription => onCursorPositionChanged");
		}

		// Remove documentation overlay on active editor change
		if (!debugKeepOverlayOnCursorMove) {
			myself.contextDocumentation.destroyContextDocumentationOverlay();
		}
	},

	onCursorPositionChanged(event) {
		// Argument event - (Points) oldBufferPosition, oldScreenPosition, newBufferPosition, newScreenPosition, (Boolean) textChanged
		myself.console.printIf(debugEvents, "Event", `Cursor position changed: Old ${event.oldBufferPosition}, New ${event.newBufferPosition}, Text Changed '${event.textChanged}'`);

		// Remove documentation overlay on cursor move
		if (!debugKeepOverlayOnCursorMove) {
			myself.contextDocumentation.destroyContextDocumentationOverlay();
		}
	}
};
