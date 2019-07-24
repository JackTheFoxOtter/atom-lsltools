'use babel';

import AtomLsltoolsView from './atom-lsltools-view';
import { CompositeDisposable } from 'atom';

export default {

  atomLsltoolsView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.atomLsltoolsView = new AtomLsltoolsView(state.atomLsltoolsViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomLsltoolsView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-lsltools:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomLsltoolsView.destroy();
  },

  serialize() {
    return {
      atomLsltoolsViewState: this.atomLsltoolsView.serialize()
    };
  },

  toggle() {
    console.log('AtomLsltools was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
