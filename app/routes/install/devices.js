/* global requireNode */
import Ember from 'ember';

const ipc = requireNode('electron').ipcRenderer;

var Device = Ember.Object.extend({
  name: "",
  device: "",
  description: "",
  size: "",
  mountpoint: "",
  system: false
});


export default Ember.Route.extend({
  setupController: function(controller) {
    ipc.removeAllListeners('gotDevices');
    controller.set('devices', Ember.A());
    controller.set('selectedDevice1', null);
    controller.set('selectedDevice2', null);
    controller.set('disableNext', true);
    this.controller.send('updateButtonState', this.routeName);
    ipc.send('getDevices');
    ipc.on('gotDevices', function(event, data) {
      data = data.map(function(device) {
        return Device.create(device);
      });
      controller.set('devices', data);
    });
  }
});
