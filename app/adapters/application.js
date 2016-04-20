import Ember from 'ember';
import DS from 'ember-data';

var inflector = Ember.Inflector.inflector;
inflector.irregular('hardware', 'hardware');

export default DS.RESTAdapter.extend({
  host: 'https://arkos.io',
  namespace: 'data',
  pathForType: function(type) {
    return inflector.pluralize(type) + '.json';
  }
});
