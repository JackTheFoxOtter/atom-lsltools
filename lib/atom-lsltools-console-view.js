'use babel';

export default class AtomLsltoolsConsoleView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('tool-panel', 'atom-lsltools-console');

    // Create headline
    const headline = document.createElement('div');
    headline.textContent = 'LSL Tools - Console';
    headline.classList.add('atom-lsltools-console-headline');
    this.element.appendChild(headline);

    // Hide button
    const btn_hide = document.createElement('button');
    btn_hide.innerHTML = "Hide";
    btn_hide.onclick = function() {
        atom.commands.dispatch(this, 'atom-lsltools:console_toggle');
    };
    headline.appendChild(btn_hide);

    // Debug test button
    const btn_test = document.createElement('button');
    btn_test.innerHTML = "Test";
    btn_test.onclick = function() {
        atom.commands.dispatch(this, 'atom-lsltools:console_test');
    };
    headline.appendChild(btn_test);

    // Create content wrapper
    const content_wrapper = document.createElement('div');
    content_wrapper.classList.add('atom-lsltools-console-content-wrapper');
    this.element.appendChild(content_wrapper)

    // Create content container
    const content = document.createElement('div');
    content.id = "lsltools-console-content";
    content.classList.add('atom-lsltools-console-content');
    content_wrapper.appendChild(content);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getContentElement() {
      return document.getElementById("lsltools-console-content");
  }

}
