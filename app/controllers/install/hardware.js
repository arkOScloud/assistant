import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  hardware: Ember.computed.alias('controllers.install.hardware'),
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  disableNext: true,
  actions: {
    selectHardware: function(hw) {
      this.get('hardware').forEach(function(e) {
        e.set('isSelected', false);
      });
      hw.set('isSelected', true);
      this.set('selectedHardware', hw);
      this.set('disableNext', false);
      this.send('updateButtonState');
    }
  }
});
