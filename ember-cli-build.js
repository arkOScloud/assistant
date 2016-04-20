/*jshint node:true*/
/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');
var Funnel = require('broccoli-funnel');

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    // Add options here
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  app.import("bower_components/font-awesome/css/font-awesome.css");
  app.import("bower_components/fira/fira.css");
  app.import('bower_components/bootstrap/dist/js/bootstrap.js');
  app.import('bower_components/bootstrap/dist/css/bootstrap.css');
  app.import('bower_components/bootstrap/dist/css/bootstrap.css.map', {
    destDir: 'assets'
  });
  var fontAwesome = new Funnel('bower_components/font-awesome/fonts', {
      srcDir: '/',
      destDir: 'fonts'
  });
  var firaEot = new Funnel('bower_components/fira/eot', {
      srcDir: '/',
      destDir: 'assets/eot'
  });
  var firaOtf = new Funnel('bower_components/fira/otf', {
      srcDir: '/',
      destDir: 'assets/otf'
  });
  var firaTtf = new Funnel('bower_components/fira/ttf', {
      srcDir: '/',
      destDir: 'assets/ttf'
  });
  var firaWoff = new Funnel('bower_components/fira/woff', {
      srcDir: '/',
      destDir: 'assets/woff'
  });

  return app.toTree([fontAwesome, firaEot, firaOtf, firaTtf, firaWoff]);
};
