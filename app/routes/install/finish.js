/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Route.extend({
  action: {
    removeDownloadedFiles: function() {
      ipc.send('removeDownloadedFiles');
    }
  }
});
