import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['install'],
  isSplitBoot: Ember.computed.alias('controllers.install.isSplitBoot'),
  selectedMirror: Ember.computed.alias('controllers.install.selectedMirror'),
  selectedHardware: Ember.computed.alias('controllers.install.selectedHardware'),
  selectedDevice1: Ember.computed.alias('controllers.install.selectedDevice1'),
  selectedDevice2: Ember.computed.alias('controllers.install.selectedDevice2'),
  disableBack: false,
  disableNext: true,

  downloadProgress: null,
  downloadProgressPct: function() {
    var dp = this.get('downloadProgress');
    return dp ? (Math.round(dp.percentage * 10000) / 100) : 0;
  }.property('downloadProgress'),
  isDownloadDone: function() {
    return (this.get('downloadProgressPct') === 100.0);
  }.property('downloadProgressPct'),

  integrityChecked: false,

  isExtractionStarted: false,
  isExtractionDone: false,

  isDiskWriteStarted: false,
  isDiskWriteDone: false
});
