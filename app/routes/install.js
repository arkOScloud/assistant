import Ember from 'ember';


var wizardLink = {
  "install.start": ["index", "install.hardware"],
  "install.hardware": ["install.start", "install.method"],
  "install.method": ["install.hardware", "install.mirror"],
  "install.mirror": ["install.method", "install.devices"],
  "install.devices": ["install.mirror", "install.confirm"],
  "install.confirm": ["install.devices", "install.process"],
  "install.process": ["install.confirm", "install.finish"],
  "install.finish": ["install.process", "index"]
};

export default Ember.Route.extend({
  model: function() {
    return Ember.RSVP.hash({
      hardware: this.store.findAll('hardware'),
      mirrors: this.store.findAll('mirror')
    });
  },
  actions: {
    willTransition: function(transition) {
      this.send('updateButtonState', transition.targetName);
    },
    updateButtonState: function(routeName) {
      routeName = routeName ? routeName : this.controllerFor('application').get('currentRouteName');
      this.controller.set('disableBack', this.controllerFor(routeName).get('disableBack') === true);
      this.controller.set('disableNext', this.controllerFor(routeName).get('disableNext') === true);
    },
    wizardPrev: function() {
      var routeName = this.controllerFor('application').get('currentRouteName');
      this.controllerFor(routeName).send('didGoBack');
      this.transitionTo(wizardLink[routeName][0]);
    },
    wizardNext: function() {
      var routeName = this.controllerFor('application').get('currentRouteName');
      this.controllerFor(routeName).send('didGoForward');
      this.transitionTo(wizardLink[routeName][1]);
    },
    didGoBack: function() {
      return true;
    },
    didGoForward: function() {
      return true;
    }
  }
});
