import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
  logo: DS.attr('string'),
  images: DS.attr()
});
