import Ember from 'ember';

export default Ember.Controller.extend({
  disableBack: false,
  disableNext: false,

  hardware: Ember.computed.alias('model.hardware'),
  mirrors: Ember.computed.alias('model.mirrors'),
  
  selectedHardware: null,
  isSplitBoot: false,
  selectedMirror: null,
  selectedDevice1: null,
  selectedDevice2: null
});
