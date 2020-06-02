'use babel';

let myself;

export default class LSLToolsContextDocumentationView {

    constructor(base, serializedState) {
        // Store reference to this so we can still use it in anonymous functions where the scope is different
        myself = this;
        myself.base = base;

        // Create root element
        myself.element = document.createElement('div');
        myself.element.classList.add('atom-lsltools-overlay');

        // Headline
        myself.headline = document.createElement('div');
        myself.headline.classList.add('atom-lsltools-overlay-headline');
        myself.element.appendChild(myself.headline);

        // Create content wrapper
        myself.contentWrapper = document.createElement('div');
        myself.contentWrapper.classList.add('atom-lsltools-overlay-content-wrapper');
        myself.element.appendChild(myself.contentWrapper);
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {

    }

    // Tear down any state and detach
    destroy() {
        myself.element.remove();
    }

    // Return this view's root element
    getElement() {
        return myself.element;
    }

    async addDocumentationEntry(description_source, context_documentation, buttons) {
        // description_source               // [kwdb || slwiki || user_specific]
        // context_documentation_dataset = {
        //     'category': category, 		// [keyword || type || constant || function || event]
        //     'name': name, 				// Name of the element
        //     'description': description,	// Description of the element
        //     'status': "normal",			// [normal || deprecated || godmode || unimplemented]
        //     'type': null,				// {constant} type of this value, {function} return type
        //     'value': null,				// only for {constant}
        //     'parameters': []				// list of {name, type} params
        // }
        // buttons                          // [{'icon': <icon_name>, 'callback': <callback_function>}]
        //
        // Note: All assignments of "innerHTML" properties are surrounded by brackets to prevent
        //       A big in Atom's syntax highlighting system

        // If result is an error, throw it! (So that asynchronous errors can be added to UI)
        if (context_documentation instanceof Error) throw context_documentation;

        //If promise is passed, delay appending of element until promise is resolved!
        if (typeof context_documentation.then === 'function') {
            // Create "wait"-placeholder element
            let wait_spinner = document.createElement('div');
            wait_spinner.innerHTML = (`<div></div><div></div><div></div><div></div>`);
            wait_spinner.classList.add('atom-lsltools-lds-ellipsis');
            myself.contentWrapper.appendChild(wait_spinner);

            context_documentation.then((promise_result) => {
                // Promise resolved, create entry for promise_result
                myself.contentWrapper.removeChild(wait_spinner); // TODO: Sometimes fails when spamming the function
                // Call add_documentation_entry again with resolved value
                myself.addDocumentationEntry(description_source, promise_result, buttons);
            }).catch((error) => {
                // Promise rejected, create error entry
                myself.contentWrapper.removeChild(wait_spinner); // TODO: Sometimes fails when spamming the function
                myself.addDocumentationEntry(description_source, {
					'description': error.toString(),
					"status": "error"
				}, []);
                if (myself.base.debugThrowContextDocumentationErrors) throw error;
            });
            // Return, function will be called again (or throw error) once the promise resolves
            return;
        }

        // Create DOM-elements
        let data_container = document.createElement('div');
        let data_status = document.createElement('span');
        let data_type_value = document.createElement('div');
        let data_description = document.createElement('div');
        let data_parameters = document.createElement('div');

        // Overlay content CSS-classes
        data_container.classList.add('atom-lsltools-overlay-data-container');
        data_description.classList.add('atom-lsltools-overlay-data-description');
        data_parameters.classList.add('atom-lsltools-overlay-data-parameters');
        data_type_value.classList.add('atom-lsltools-overlay-data-type-value');
        if (context_documentation.status) {
            switch(context_documentation.status) {
                case 'godmode':
                    data_status.classList.add('atom-lsltools-status-godmode');
                    break;
                case 'deprecated':
                    data_status.classList.add('atom-lsltools-status-deprecated');
                    break;
                case 'unimplemented':
                    data_status.classList.add('atom-lsltools-status-unimplemented');
                    break;
                case 'error':
                    data_status.classList.add('atom-lsltools-status-error');
            }
        }

        // Headeline - only set once
        if (!myself.headline.textContent && context_documentation.name) {
            if (context_documentation.category) {
                let category_string_formatted = context_documentation.category[0].toUpperCase() + context_documentation.category.slice(1);

                let params_string = "";
                if (['function', 'event'].includes(context_documentation.category)) {
                    // Functions and events can have parameters
                    params_string += "(";
                    if (context_documentation.parameters && context_documentation.parameters.length > 0) {
                        context_documentation.parameters.forEach((parameter) => {
                            if (context_documentation.parameters.indexOf(parameter) == context_documentation.parameters.length-1) {
                                params_string += `<span>${parameter.name}</span>`;
                            } else {
                                params_string += `<span>${parameter.name}</span>, `;
                            }
                        });
                    }
                    params_string += ")";
                }

                let name_string_formatted = `${context_documentation.name}${params_string}`;
                myself.headline.innerHTML = (`${category_string_formatted}: <span><b>${name_string_formatted}</b></span>`);
            }
        }

        // Documentation entry values (generic)
        if (context_documentation.status) {
            data_status.innerHTML = (`Status: <span><b>${context_documentation.status}</b></span>`);
        }
        if (context_documentation.description) {
            data_description.innerHTML = (`${context_documentation.description}`);
        }
        if (context_documentation.value) {
            // Type + Value
            // Type defines type of value
            data_type_value.innerHTML = (`Value: '${context_documentation.value}' (<span>${context_documentation.type}</span>)`);
        } else if (context_documentation.type) {
            // Only Type
            // Type is function return type
            data_type_value.innerHTML = (`Returns: <span>${context_documentation.type}</span>`);
        } else if (context_documentation.category == 'function') {
            // Function, but no return type
            data_type_value.innerHTML = (`Returns <span>void</span>`);
        }
        if (context_documentation.parameters && context_documentation.parameters.length > 0) {
            // Add parmeters
            let param_tab = document.createElement('table');
            context_documentation.parameters.forEach((parameter) => {
                let param_row = param_tab.insertRow(context_documentation.parameters.indexOf(parameter));
                param_row.insertCell(0).textContent = parameter.type;
                param_row.insertCell(1).textContent = parameter.name;
            });
            data_parameters.textContent = `Parameter list:`;
            data_parameters.appendChild(param_tab);
        }

        // Documentation entry values (specific)
        switch(description_source) {
            case 'kwdb':
                data_container.textContent = 'Description from KWDB.xml';
                data_container.classList.add('atom-lsltools-kwdb-data');
                data_description.classList.add('atom-lsltools-kwdb-data');
                break;
            case 'slwiki':
                data_container.textContent = 'Description from SLWiki';
                data_container.classList.add('atom-lsltools-slwiki-data');
                data_description.classList.add('atom-lsltools-kwdb-data');
                break;
            case 'user_specific':
                data_container.textContent = 'User specific description';
                data_container.classList.add('atom-lsltools-user-specific-data');
                data_description.classList.add('atom-lsltools-user-specific-data');
                break;
            default:
                data_container.classList.add('atom-lsltools-generic-data');
                data_description.classList.add('atom-lsltools-generic-data');
        }

        // Add individual elements to DOM structure
        buttons.forEach((button) => {
            // Add buttons
            button_element = document.createElement("span");
            button_element.classList.add('icon', `icon-${button.icon}`);
            button_element.onclick = button.callback;
            data_container.appendChild(button_element);
        });
        if (data_status.innerHTML.length > 0)      { data_container.appendChild(data_status); }
        if (data_description.innerHTML.length > 0) { data_container.appendChild(data_description); }
        if (data_type_value.innerHTML.length > 0)  { data_container.appendChild(data_type_value); }
        if (data_parameters.innerHTML.length > 0)  { data_container.appendChild(data_parameters); }

        // Determine target width for content inside content wrapper (based on headline length)
        let target_width = Math.max(600, myself.headline.offsetWidth);
        data_container.style.width = `${target_width}px`;

        myself.contentWrapper.appendChild(data_container);
    }

    update_layout() {
        // Called the animation frame after this view has been rendered
        myself.contentWrapper.childNodes.forEach((child) => {
            if (child.classList.contains('atom-lsltools-overlay-data-container')) {
                // Element is data container, update width (Solution to [BUG-001])
                let target_width = Math.max(600, myself.headline.offsetWidth);
                child.style.width = `${target_width}px`;
            }
        });
    }

    getDocumentationEntries() {
        return myself.contentWrapper.children;
    }

    resetDocumentationEntries() {
        while (myself.contentWrapper.firstChild) {
            myself.contentWrapper.removeChild(myself.contentWrapper.firstChild);
        }
        myself.headline.innerHTML = "";
    }
}
