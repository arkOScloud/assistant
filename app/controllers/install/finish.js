import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  disableBack: true
});
