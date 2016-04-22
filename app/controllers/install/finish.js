/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Controller.extend({
  needs: ['install'],
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  disableBack: true,

  actions: {
    removeDownloadedFiles: function() {
      ipc.send('removeDownloadedFiles');
    }
  }
});
