import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  mirrors: Ember.computed.alias('controllers.install.mirrors'),
  selectedMirror: Ember.computed.alias('controllers.install.selectedMirror'),
  disableNext: true,

  actions: {
    selectMirror: function(mi) {
      this.get('mirrors').forEach(function(e) {
        e.set('isSelected', false);
      });
      mi.set('isSelected', true);
      this.set('selectedMirror', mi);
      this.set('disableNext', false);
      this.send('updateButtonState');
    }
  }
});
