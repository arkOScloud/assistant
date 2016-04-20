/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Route.extend({
  setupController: function(controller) {
    controller.set('isSearching', true);
    controller.set('servers', Ember.A());
    ipc.removeAllListeners('scannedServer');
    ipc.removeAllListeners('setSearchingStatus');
    ipc.send('scanNetwork');
    ipc.on('scannedServer', function(event, data) {
      data.httpAddr = 'http://' + data.host + ':' + data.port;
      controller.get('servers').pushObject(data);
    });
    ipc.on('setSearchingStatus', function(event, data) {
      controller.set('isSearching', data);
    });
  },

  actions: {
    refresh: function() {
      this.controller.set('isSearching', true);
      this.controller.set('servers', Ember.A());
      ipc.send('scanNetwork');
    }
  }
});
