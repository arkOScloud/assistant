/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Route.extend({
  actions: {
    openPage: function(page) {
      this.transitionTo(page);
    },
    exitApp: function() {
      ipc.send('exitApp');
    }
  }
});
