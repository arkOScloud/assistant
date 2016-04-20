import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),
  selectedDevice1: Ember.computed.alias('controllers.install.selectedDevice1'),
  selectedDevice2: Ember.computed.alias('controllers.install.selectedDevice2'),
  disableNext: true,

  allowNext: function() {
    var valid1 = (this.get('isSplitBoot') && this.get('selectedDevice1') !== null && this.get('selectedDevice2') !== null);
    var valid2 = (!this.get('isSplitBoot') && this.get('selectedDevice1') !== null);
    if (valid1 || valid2) {
      this.set('disableNext', false);
      this.send('updateButtonState');
    } else if (!this.get('disableNext')) {
      this.set('disableNext', true);
      this.send('updateButtonState');
    }
  }.observes('isSplitBoot', 'selectedDevice1', 'selectedDevice2'),

  actions: {
    selectDevice: function(dev) {
      if (this.get('isSplitBoot')) {
        if (dev.get('selectedFor') === 'Data') {
          dev.set('selectedFor', null);
          this.set('selectedDevice2', null);
        } else if (dev.get('selectedFor') === 'Boot') {
          dev.set('selectedFor', null);
          this.set('selectedDevice1', null);
        } else {
          if (this.get('selectedDevice1') !== null) {
            dev.set('selectedFor', 'Data');
            this.set('selectedDevice2', dev);
          } else {
            dev.set('selectedFor', 'Boot');
            this.set('selectedDevice1', dev);
          }
        }
      } else {
        this.get('devices').forEach(function(device) {
          device.set('selectedFor', null);
        });
        dev.set('selectedFor', 'Default');
        this.set('selectedDevice1', dev);
        this.set('selectedDevice2', null);
      }
    }
  }
});
