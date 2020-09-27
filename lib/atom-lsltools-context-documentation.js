'use babel';

let debugThrowContextDocumentationErrors = false;
let myself;

import LSLToolsContextDocumentationView from './views/atom-lsltools-context-documentation-view';
import LSLToolsProgressNotification from './atom-lsltools-progress-notification'
export default class LSLToolsContextDocumentation {

    constructor(main, state) {
        myself = this;
        myself.main = main;

        myself.contextDocumentationView = new LSLToolsContextDocumentationView(myself, state.lsltoolsContextDocumentationViewState)
    }

    serializeView() {
        return { lsltoolsContextDocumentationViewState: myself.contextDocumentationView.serialize() };
    }

    deactivate() {
        myself.contextDocumentationView.destroy();
    }

    // ====================================================================================================================
	// ---------------------------------------[Context Documentation]------------------------------------------------------
	// ====================================================================================================================

	process() {
		let scopeDescriptor = myself.main.activeTextEditor.getRootScopeDescriptor();
		if (scopeDescriptor && scopeDescriptor.scopes.length) {
			let currentLanguage = scopeDescriptor.scopes[0];
			if (currentLanguage !== 'source.lsl') {
				return;
			}
		}

		cursorBufferPos = myself.main.activeTextEditor.getCursorBufferPosition();
		var lineAtCursor = myself.main.activeTextEditor.getBuffer().lineForRow(cursorBufferPos.row);
		var lineToCursor = myself.main.activeTextEditor.getTextInRange([[cursorBufferPos.row, 0], cursorBufferPos]);
		var wordAtCursor = myself.main.activeTextEditor.getWordUnderCursor();

		// myself.main.console.print("Test", `Cursor is at position ${cursorBufferPos}`);
		// myself.main.console.print("Test", `Line at cursor: "${lineAtCursor}"`);
		// myself.main.console.print("Test", `Line to cursor: "${lineToCursor}"`);
		myself.main.console.print("Test", `Word at cursor: "${wordAtCursor}"`);

		// Reset documentation overlay content
		myself.contextDocumentationView.resetDocumentationEntries();

		// Determine content for documentation overlay
		if (/^[a-zA-Z0-9\-_]+$/.test(wordAtCursor)) {
			// wordAtCursor can be a valid keyword (proper word, no special character that could break selectors)

			// Add documentation entry for user specific data
			// TODO

			// Add documentation entry for KWDB.xml
			try {
				let kwdbDocumentation = myself.getKwdbDocumentation(wordAtCursor);
				let kwdb_buttons = [{"icon": "link-external", "callback": () => { myself.main.utils.openKwdbFile(wordAtCursor); }}];
				if (kwdbDocumentation) {
					myself.contextDocumentationView.addDocumentationEntry('kwdb', kwdbDocumentation, kwdb_buttons);
				}
			} catch(error) {
				// Display error in UI instead of data
				myself.contextDocumentationView.addDocumentationEntry('kwdb', {
					'description': error.toString(),
					"status": "error"
				}, []);
				if (debugThrowContextDocumentationErrors) throw error;
			}

			// Add documentation entry for SLWiki
			try {
				let lswiki_documentation = myself.getSlwikiDocumentation(wordAtCursor);
				if (lswiki_documentation) {
                    let lswiki_buttons = [{"icon": "link-external", "callback": () => {
                        if (typeof lswiki_documentation.then === 'function') {
                            lswiki_documentation.then((result) => {
                                window.open(result['external_url']);
                            });
                        } else {
                            window.open(lswiki_documentation['external_url']);
                        }
                    }}];
					myself.contextDocumentationView.addDocumentationEntry('slwiki', lswiki_documentation, lswiki_buttons);
				}
			} catch(error) {
				myself.contextDocumentationView.addDocumentationEntry('slwiki', {
					'description': error.toString(),
					"status": "error"
				}, []);
				if (debugThrowContextDocumentationErrors) throw error;
			}

			// Show message if no documentation has been found
			if (myself.contextDocumentationView.getDocumentationEntries().length == 0) {
				myself.contextDocumentationView.headline.textContent = `No documentation for '${wordAtCursor}'`;
			}

			// (Re-)Create overlay element
			myself.destroyContextDocumentationOverlay();
			myself.showContextDocumentationOverlay(myself.main.activeTextEditor);
		}
	}

	// Returns object containing all known documentation parameters
	getKwdbDocumentation(keyword) {
		if (!myself.main.kwdbDom) throw new Error(`KWDB.xml is not loaded (yet)!`);
		let kwdbEntry = myself.main.kwdbDom.querySelector(`*[name="${escape(keyword)}"]`); // Select any type where the 'name' attribute matches the current keyword
		if (!kwdbEntry) throw new Error(`Keyword '${keyword}' not in kwdb.xml!`);
		return myself.xmlNode2ContextDocumentation(kwdbEntry);
	}

	// Returns object containing all known documentation parameters, or promise resolving to one
	getSlwikiDocumentation(keyword) {
		if (!myself.main.slwikiCacheDom) throw new Error(`SLWiki-cache DOM Object not loaded!`);
		if (!keyword) throw new Error(`No keyword provided.`);

		// First look if the page is cached, if not, load into cache
		let slwikiCacheEntry = myself.main.slwikiCacheDom.querySelector(`cache > keywords > *[name="${keyword}"]`);
		if(!slwikiCacheEntry) {
			// Not cached, fetch from page (return promise)
			return new Promise((resolve, reject) => {
				myself.getSlwikiKeywordDescription(keyword).then(async (keywordDescription) => {
					try {
						if (!keywordDescription) throw new Error(`No SLWiki description for keyword '${keyword}' found!`);
						// Data from keyword description (what we have before fetching the page)
						let category = keywordDescription.category;
						let slwikiURL = keywordDescription.url;

						await myself.main.utils.fetchExternalHtmlContent(slwikiURL).then((slwikiDOM) => {
							let description = "";
							let status = "normal";
							let type = null;
							let value = null;
							let parameters = [];

							switch(category) {
								case "type":
									slwikiDOM.querySelectorAll("#LSLHeader ~ p").forEach((paragraph) => {
										description += paragraph.textContent;
									});
                                    // TODO: On the integer page, this matches many siblings which aren't part of the first section,
                                    //       But there is currently no way in CSS to limit the selection further it seems...
									break;

								case "constant":
									slwikiDOM.querySelectorAll("#Description ~ div > p").forEach((paragraph) => {
										description += paragraph.textContent;
									});
									type = slwikiDOM.querySelector("#Description > a").textContent;
									value = slwikiDOM.querySelector("#Description > span").textContent;
									console.log(`Desc: ${description}, Type: ${type}, Value: ${value}`);
									break;

								case "function":
									slwikiDOM.querySelectorAll("#Summary ~ div > p").forEach((paragraph) => {
										description += paragraph.textContent;
									});
									type = slwikiDOM.querySelector("#Summary > a").textContent;
									slwikiDOM.querySelectorAll("#Summary ~ div > table > tbody > tr").forEach((tableRow) => {
										let cells = tableRow.querySelectorAll("td");
										let paramType = cells[0].textContent.slice(1).trim();
										let paramName = cells[1].textContent.trim();
										//let paramDesc = cells[3].textContent.trim(); //Unused
										parameters.push({"type": myself.main.utils.escapeHtml(paramType), "name": myself.main.utils.escapeHtml(paramName)});
									});
									break;

								case "event":
									slwikiDOM.querySelectorAll("#Description ~ div > p").forEach((paragraph) => {
										description += paragraph.textContent;
									});
									slwikiDOM.querySelectorAll("#Description ~ div > table > tbody > tr").forEach((tableRow) => {
										let cells = tableRow.querySelectorAll("td");
										let paramType = cells[0].textContent.slice(1).trim();
										let paramName = cells[1].textContent.trim();
										//let paramDesc = cells[3].textContent.trim(); //Unused
										parameters.push({"type": myself.main.utils.escapeHtml(paramType), "name": myself.main.utils.escapeHtml(paramName)});
									});
							}

							let contextDocumentation = {
								'category': myself.main.utils.escapeHtml(category),
								'name': myself.main.utils.escapeHtml(keyword),
								'description': myself.main.utils.escapeHtml(description).trim(),
								'status': myself.main.utils.escapeHtml(status),
								'type': myself.main.utils.escapeHtml(type),
								'value': myself.main.utils.escapeHtml(value),
								'parameters': parameters,
                                'external_url': slwikiURL
							};

                            // Loaded documentation entry, write to cache
							documentationCacheNode = myself.contextDocumentation2XmlNode(myself.main.slwikiCacheDom, contextDocumentation);
							myself.addNodes2XmlDom(myself.main.slwikiCacheDom, 'cache.keywords', [documentationCacheNode]);
							myself.main.fileIO.serializeAndWriteDOM(myself.main.slwikiCacheDom, atom.config.get('LSL-Tools.pathToSLWikiCacheFile'), "SLWiki cache file", true);

							resolve(contextDocumentation);
						});
					} catch(error) {
						reject(error);
					}
				});
			});
		}

		// Cached, return object from cache
		return myself.xmlNode2ContextDocumentation(slwikiCacheEntry);
	}

	// Returns SLWiki description object for specified keyword, or null if not found.
    // Will prioritize keyword cache and rebuild that in case it's missing.
    // Returns {"keyword": keyword, "category": category, "url": url}
	async getSlwikiKeywordDescription(keyword) {
		let keywordIndexCacheNode = myself.main.slwikiCacheDom.querySelector('cache keyword_urls');

		if (!keywordIndexCacheNode) {
			// No cached SLWiki keyword index. Needs to be constructed.
			// Fetch SLWiki keyword index and add each keyword description information to the slwikiCacheDom-object
			await myself.fetchSlwikiKeywordIndex().then((keywordIndex) => {
				let newDescriptionNodes = [];
				keywordIndex.forEach((keywordDescription) => {
					let newDescriptionNode = myself.main.slwikiCacheDom.createElement(`keyword-url`);
					newDescriptionNode.setAttribute("category", keywordDescription.category);
					newDescriptionNode.setAttribute("keyword", keywordDescription.keyword);
					newDescriptionNode.textContent = keywordDescription.url;
					newDescriptionNodes.push(newDescriptionNode);
				});
				myself.addNodes2XmlDom(myself.main.slwikiCacheDom, 'cache.keyword_urls', newDescriptionNodes);
			});
			// Update (save) the slwikiCacheDom-object
			await myself.main.fileIO.serializeAndWriteDOM(myself.main.slwikiCacheDom, atom.config.get('LSL-Tools.pathToSLWikiCacheFile'), "SLWiki cache file", true);

			// Reassign keywordIndexCacheNode since it exists now.
			keywordIndexCacheNode = myself.main.slwikiCacheDom.querySelector('cache keyword_urls');
		}

		// Return node containing keyword or null if not found
		let resultNode = keywordIndexCacheNode.querySelector(`keyword-url[keyword="${keyword}"]`);
		return (resultNode) ? {
			"category": resultNode.getAttribute('category'),
			"keyword": resultNode.getAttribute('keyword'),
			"url": resultNode.innerHTML
		} : null;
	}

	// Returns a promise that resolves to an array of objects containing keyword descriptions.
    // These descripe what SLWiki page and category belong to each keyword
	// Returns [{"keyword": keyword, "category": category, "url": url}, [...]]
	async fetchSlwikiKeywordIndex() {
		// [keyword || type || constant || function || event]
		let categories = ['type', 'constant', 'function', 'event'];
        let progressNotification = new LSLToolsProgressNotification("&nbsp;");
		let keywordDescriptions = [];

		for (i = 0; i < categories.length; i++) {
			let category = categories[i];
			let initialkeywordDescriptionsCount = keywordDescriptions.length;
			let pageCount = 0;
			let page_url;
            progressNotification.setText(`Fetching SLWiki Index for '${category}s' (${i+1}/${categories.length})...`);
			console.log(`Fetching SLWiki Index for '${category}s' (${i+1}/${categories.length})...`);

			switch (category) {
				case "type":
					page_url = `http://wiki.secondlife.com/wiki/Category:LSL_Types`;
					await myself.main.utils.fetchExternalHtmlContent(page_url).then((dom) => {
						pageCount++;
						dom.querySelectorAll(`div[id="mw-subcategories"] a`).forEach((entry) => {
							let keyword = entry.innerText.slice(4).toLowerCase().replace(/\s/g, '_');
							let url = `http://wiki.secondlife.com${entry.getAttribute('href')}`;
							keywordDescriptions.push({"keyword": keyword, "category": category, "url": url});
						});
					});
					break;
				case "constant":
					page_url = `http://wiki.secondlife.com/wiki/Category:LSL_Constants`;
					while(page_url) {
						await myself.main.utils.fetchExternalHtmlContent(page_url).then((dom) => {
							page_url = null;
							pageCount++;
							dom.querySelectorAll(`div[id="mw-pages"] a`).forEach((entry) => {
								if (entry.innerText == 'next 200') {
									page_url = `http://wiki.secondlife.com${entry.getAttribute('href')}`;
								} else if (entry.innerText != 'previous 200') {
									let keyword = entry.innerText.replace(/\s/g, '_');
									let url = `http://wiki.secondlife.com${entry.getAttribute('href')}`;
									keywordDescriptions.push({"keyword": keyword, "category": category, "url": url});
								}
							});
						}).catch((error) => {
							page_url = null; // Force exit condition for loop if something went wrong
							throw error;
						});
					}
					break;
				case "function":
					page_url = `http://wiki.secondlife.com/wiki/Category:LSL_Functions`;
					await myself.main.utils.fetchExternalHtmlContent(page_url).then((dom) => {
						pageCount++;
						dom.querySelectorAll(`div[id="mw-content-text"] > ul[style="column-width:20.5em; -moz-column-width:20.5em; -webkit-column-width:20.5em;"] a`).forEach((entry) => {
							let keyword = entry.innerText.replace(/\s/g, '_');
							let url = `http://wiki.secondlife.com${entry.getAttribute('href')}`;
							keywordDescriptions.push({"keyword": keyword, "category": category, "url": url});
						});
					});
					break;
				case "event":
					page_url = `http://wiki.secondlife.com/wiki/Category:LSL_Events`;
					await myself.main.utils.fetchExternalHtmlContent(page_url).then((dom) => {
						pageCount++;
						dom.querySelectorAll(`div[id="mw-pages"] a`).forEach((entry) => {
							let keyword = entry.innerText.toLowerCase().replace(/\s/g, '_');
							let url = `http://wiki.secondlife.com${entry.getAttribute('href')}`;
							keywordDescriptions.push({"keyword": keyword, "category": category, "url": url});
						});
					});
					break;
			}

            progressNotification.setProgress((i+1) / categories.length);
			console.log(`Fetched ${keywordDescriptions.length-initialkeywordDescriptionsCount} ${category}s from ${pageCount} page(s).`);
		}

		return keywordDescriptions;
	}


	// Returns object containing context-documentation or Promise resolving to it
	xmlNode2ContextDocumentation(domNode) {
		if (!domNode) return new Error(`Empty DOM-node provided.`);
		if (typeof domNode.then === 'function') {
			// Provided node is (probably) a promise
			return new Promise((resolve, reject) => {
				domNode.then((promiseResult) => {
					resolve(myself.xmlNode2ContextDocumentation(promiseResult));
				}).catch((error) => {
					resolve({
						'description': error.toString(),
						'status': "error"
					});
					if (debugThrowContextDocumentationErrors) throw error;
				});
			});
		}

		// Check if node is explicitly grid-specific and does't apply to the Second Life main grid. Discard.
		// (If no explicit grids are defined, assume Second Life main grid)
		let grids = domNode.getAttribute('grid');
		if (grids && !grids.includes('sl')) return new Error(`DOM-node for unsupported grid provided.`);

		// Get the actual information out of the DOM-node
		let keyword = domNode.getAttribute('name');
		if (!keyword) return new Error(`DOM-node doesn't contain required 'name'-parameter!`);
		let descriptionNode = domNode.querySelector('description[lang="en"]');
		let description = (descriptionNode) ? descriptionNode.textContent.trim() : null;
		let parameterNodes = domNode.querySelectorAll('param');
		let parameters = [];
		parameterNodes.forEach((parameterNode) => {
			parameters.push({"type": parameterNode.getAttribute('type'), "name": parameterNode.getAttribute('name')});
		});
		// Status - If system default status, set status to "normal"
		let status = domNode.getAttribute('status');
		status = (status === null) ? 'normal' : status;

		return {
			'category': (domNode.tagName) ? domNode.tagName.toLowerCase() : "<No Category>",
			'name': (keyword) ? keyword : "<No Name>",
			'description': (description) ? description : "<No Description>",
			'status': (status) ? status : "none",
			'type': domNode.getAttribute('type'), // Can be null
			'value': domNode.getAttribute('value'), // Can be null
            'external_url': domNode.getAttribute('external_url'), // Can be null
			'parameters': (parameters) ? parameters : []
		};
	}

	contextDocumentation2XmlNode(dom, contextDocumentation) {
		let newNode = dom.createElement(contextDocumentation.category);
		newNode.setAttribute('name', contextDocumentation.name);
		newNode.setAttribute('status', contextDocumentation.status);
		if (contextDocumentation.type) newNode.setAttribute('type', contextDocumentation.type);
		if (contextDocumentation.value) newNode.setAttribute('value', contextDocumentation.value);
        if (contextDocumentation.external_url) newNode.setAttribute('external_url', contextDocumentation.external_url);
		contextDocumentation.parameters.forEach((parameter) => {
			let paramNode = dom.createElement('param');
			paramNode.setAttribute('type', parameter.type);
			paramNode.setAttribute('name', parameter.name);
			newNode.appendChild(paramNode);
		});
		let descriptionNode = dom.createElement('description');
		descriptionNode.setAttribute('lang', 'en');
		descriptionNode.innerHTML = contextDocumentation.description;
		newNode.appendChild(descriptionNode);

        console.log(newNode);
		return newNode;
	}

	// Adds nodes to DOM element. Path specifies the part inside the dom to the element (dot-separated)
	// Nodes is array of xml_nodes (that ALREADY BELONG to dom)
	addNodes2XmlDom(dom, path, nodes) {
		if (!dom) throw new Error(`No XML-DOM object specified!`);
		if (!nodes || nodes.length == 0) throw new Error(`No nodes to append to XML-DOM object specified!`);
		pathSegments = path.split('.');
		let latestPathNode = dom;
		pathSegments.forEach((pathSegment) => {
			let nextPathNode = latestPathNode.querySelector(pathSegment);
			if (nextPathNode) {
				latestPathNode = nextPathNode;
			} else {
				let newNode = dom.createElement(pathSegment);
				latestPathNode.appendChild(newNode);
				latestPathNode = newNode;
			}
		});

		nodes.forEach((node) => {
			latestPathNode.appendChild(node);
		});
	}

	showContextDocumentationOverlay(editor) {
		// Add decoration
		myself.contextDocumentationOverlay = editor.decorateMarker(editor.getLastCursor().marker, {
			item: myself.contextDocumentationView,
			type: 'overlay',
			invalidate: 'touch',
			position: 'after',
			avoidOverflow: false
		});
        // Register the view's update_layout function to be invoked before the next repaint
        window.requestAnimationFrame(myself.contextDocumentationView.update_layout);
	}

	destroyContextDocumentationOverlay() {
		if(myself.contextDocumentationOverlay) {
			myself.contextDocumentationOverlay.destroy();
		}
	}
};
