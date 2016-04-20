import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('install', function() {
    this.route('start');
    this.route('hardware');
    this.route('method');
    this.route('mirror');
    this.route('devices');
    this.route('confirm');
    this.route('process');
    this.route('finish');
  });
  this.route('search');
});

export default Router;
