import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),

  actions: {
    selectInstallType: function(it) {
      this.set('isSplitBoot', it === 'split');
    }
  }
});
