/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;


export default Ember.Route.extend({
  setupController: function(controller) {
    var self = this;
    ipc.removeAllListeners('updateDownloadProgress');
    ipc.removeAllListeners('downloadComplete');
    ipc.removeAllListeners('integrityCheckComplete');
    ipc.removeAllListeners('extractionStarted');
    ipc.removeAllListeners('extractionComplete');
    ipc.removeAllListeners('diskWrite1Done');
    ipc.removeAllListeners('diskWrite2Done');
    controller.set('disableNext', true);
    controller.send('updateButtonState', this.routeName);

    var isSplitBoot = this.controllerFor('install').get('isSplitBoot');
    var selectedDevice1 = this.controllerFor('install').get('selectedDevice1');
    var selectedDevice2 = this.controllerFor('install').get('selectedDevice2');

    var imageUrl;
    var mirror = this.controllerFor('install').get('selectedMirror');
    this.controllerFor('install').get('selectedHardware.images').forEach(function(i) {
      if ((isSplitBoot && i.type === 'split') || (!isSplitBoot && i.type === 'default')) {
        imageUrl = mirror.get('url') + i.path;
      }
    });

    ipc.send('startDownload', imageUrl);
    ipc.on('updateDownloadProgress', function(event, data) {
      controller.set('downloadProgress', data);
    });
    ipc.on('updateWriteProgress', function(event, data) {
      controller.set('writeProgress', data);
    });
    ipc.on('downloadComplete', function() {
      ipc.send('startIntegrityCheck', imageUrl + '.sha256.txt');
    });
    ipc.on('integrityCheckComplete', function(event, data) {
      if (data === 'pass') {
        controller.set('integrityChecked', true);
        ipc.send('startExtraction');
      }
    });
    ipc.on('extractionStarted', function() {
      controller.set('isExtractionStarted', true);
    });
    ipc.on('extractionComplete', function(event, data, image1, image2) {
      if (data === 'pass') {
        controller.set('isExtractionDone', true);
        controller.set('isDiskWriteStarted', true);
        controller.set('disableBack', true);
        controller.send('updateButtonState', this.routeName);
        ipc.send('writeDisks', image1, selectedDevice1.get('device'),
          image2, selectedDevice2.get('device'));
      }
    });
    ipc.on('diskWriteDone', function() {
      controller.set('isDiskWriteDone', true);
      controller.set('disableNext', false);
      controller.send('updateButtonState', self.routeName);
      self.send('wizardNext');
    });
  },

  actions: {
    didGoBack: function() {
      ipc.send('sendAbort');
    }
  }
});
