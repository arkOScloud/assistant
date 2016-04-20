import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),
  selectedMirror: Ember.computed.alias('controllers.install.selectedMirror'),
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  selectedDevice1: Ember.computed.alias('controllers.install.selectedDevice1'),
  selectedDevice2: Ember.computed.alias('controllers.install.selectedDevice2')
});
