'use babel';

import { File } from 'atom';

let myself;

export default class LSLToolsFileIO {

    constructor(main) {
        myself = this;
        this.main = main;
    }

    async loadAndParseXMLFile(filePath, fileName, createIfNotExisting, defaultContent) {
		let file = null;
		let dom = null;
		await myself.loadFile(filePath, fileName, createIfNotExisting, defaultContent).then((loadedFile) => {
			// File loaded
			file = loadedFile;
			return myself.parseXMLFile(loadedFile, fileName);
		}).then((parsedDOM) => {
			// File parsed
			dom = parsedDOM;
		}).catch((error) => {
			atom.notifications.addError(error.toString());
		});

		return {file, dom};
	}

	// Returns Promise that resolves to the loaded file object
	async loadFile(filePath, fileName, createIfNotExisting, defaultContent) {
		if (!filePath) throw new Error(`No path to ${fileName} specified! Check plugin settings.`);
		let file = new File(filePath);
		await file.exists().then(async (exists) => {
			if (!exists) {
				if (!createIfNotExisting) throw new Error(`'${filePath}' does not exist!`);
				await file.create().then(async (success) => {
					if (!success) throw new Error(`Failed to create '${filePath}'!`);
					if (defaultContent) await file.write(defaultContent);
				});
			}
		});

		return file;
	}

	// Returns Promise that resolves to the parsed DOM-Object
	// Assumes the file exists
	async parseXMLFile(file, fileName) {
		let dom = null;
		await file.read(true).then((fileContent) => {
			if (!fileContent) throw new Error(`Failed to read ${fileName}!`);
			try {
				domParser = new DOMParser();
				dom = domParser.parseFromString(fileContent, 'text/xml');
			} catch(e) {
				throw new Error(`Failed to parse ${fileName}!`);
			}
		});

		return dom;
	}

	async serializeAndWriteDOM(dom, filePath, fileName, createIfNotExisting) {
		let file = null;
		await myself.serializeDOM(dom).then((serializedXML) => {
			// DOM-object serialized
			return myself.saveFile(filePath, fileName, createIfNotExisting, serializedXML);
		}).then((savedFile) => {
			// File parsed
			file = savedFile;
		}).catch((error) => {
			atom.notifications.addError(error.toString());
		});
		return file;
	}

	// Saves fileContent to the specified file. Creates file if createIfNotExisting is set.
	// Returns Promise that resolves to the written file object.
	async saveFile(filePath, fileName, createIfNotExisting, fileContent) {
		if (!filePath) throw new Error(`No path to ${fileName} specified! Check plugin settings.`);
		let file = new File(filePath);
		await file.exists().then(async (exists) => {
			if (!exists) {
				if (!createIfNotExisting) throw new Error(`'${filePath}' does not exist!`);
				await file.create().then(async (success) => {
					if (!success) throw new Error(`Failed to create '${filePath}'!`);
					if (!fileContent) throw new Error(`No content to write to file '${filePath}' specified!`);
				});
			}
		});
		await file.write(fileContent);
		return file;
	}

	// Serializes the specified DOM-object and returns it as string
	// Assumes the file exists
	async serializeDOM(dom) {
		let serializer = new XMLSerializer();
		return serializer.serializeToString(dom);
	}
};
