/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Controller.extend({
  isSearching: true,
  servers: Ember.A(),

  actions: {
    openGenesis: function(addr) {
      ipc.send('openGenesis', addr);
    }
  }
});
