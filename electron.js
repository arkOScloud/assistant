/* jshint node: true */
'use strict';

const electron         = require('electron');
const app              = electron.app;
const BrowserWindow    = electron.BrowserWindow;
const emberAppLocation = `file://${__dirname}/dist/index.html`;
const ipc              = require('electron').ipcMain;
const dialog           = require('electron').dialog;

const fs               = require('fs');
const crypto           = require('crypto');
const bonjour          = require('bonjour');
const sudo             = require('electron-sudo');
const drivelist        = require('drivelist');
const request          = require('request');
const child_process    = require('child_process');
const requestProgress  = require('request-progress');

let mainWindow = null;
let isDownloading = false;
let processAbortFlag = false;

electron.crashReporter.start();

app.on('window-all-closed', function onWindowAllClosed() {
  app.quit();
});

app.on('ready', function onReady() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + 'public/img/icon.png'
  });

  delete mainWindow.module;

  // If you want to open up dev tools programmatically, call
  // mainWindow.openDevTools();

  // By default, we'll open the Ember App by directly going to the
  // file system.
  //
  // Please ensure that you have set the locationType option in the
  // config/environment.js file to 'hash'. For more information,
  // please consult the ember-electron readme.
  mainWindow.loadURL(emberAppLocation);

  // If a loading operation goes wrong, we'll send Electron back to
  // Ember App entry point
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(emberAppLocation);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

ipc.on('sendAbort', function() {
  processAbortFlag = true;
});

ipc.on('exitApp', function() {
  app.quit();
});

ipc.on('openGenesis', function(event, addr) {
  electron.shell.openExternal(addr);
});

ipc.on('scanNetwork', function(event) {
  event.sender.send('setSearchingStatus', true);
  var b = bonjour();
  var browser = b.find({type: 'http'}, function (service) {
    if (service.name === 'arkOS') {
      event.sender.send('scannedServer', service);
    }
  });
  setTimeout(function() {
    event.sender.send('setSearchingStatus', false);
    browser.stop();
  }, 5000);
});

ipc.on('getDevices', function(event) {
  var devices = [];
  drivelist.list(function(err, drives) {
    devices = drives.filter(function(drive) {
      return !drive.system;
    });
    event.sender.send('gotDevices', devices);
  });
});

ipc.on('startDownload', function(event, downloadUrl) {
  if (isDownloading) {
    return;
  }
  fs.stat('/tmp/arkos-latest.zip', function(err, stats) {
    if (stats && stats.isFile()) {
      console.log('Archive found in download directory. Sending for integrity check');
      event.sender.send('updateDownloadProgress', {percentage: 1.0, size: {}});
      event.sender.send('downloadComplete');
    } else {
      downloadArchive(event, downloadUrl);
    }
  });
});

var downloadArchive = function(event, downloadUrl) {
  isDownloading = true;
  console.log('Starting download');
  var r = request(downloadUrl);
  requestProgress(r)
  .on('response', function(resp) {
    if (resp.statusCode !== 200) {
      console.log('Download error: HTTP ' + resp.statusCode);
      mainWindow.loadURL(emberAppLocation);
      dialog.showErrorBox('Download Error', 'HTTP ' + resp.statusCode);
    }
  })
  .on('progress', function(state) {
    /* console.log('Download progress: ' + (Math.round(state.percentage * 10000) / 100) + '%'); */
    if (processAbortFlag) {
      r.abort();
    }
    mainWindow.setProgressBar(state.percentage);
    event.sender.send('updateDownloadProgress', state);
  })
  .on('error', function(err) {
    console.log('Download error: ' + err);
    mainWindow.setProgressBar(-1);
    mainWindow.loadURL(emberAppLocation);
    dialog.showErrorBox('Download Error', err.message);
  })
  .on('end', function() {
    isDownloading = false;
    mainWindow.setProgressBar(-1);
    if (processAbortFlag) {
      processAbortFlag = false;
      fs.unlink('/tmp/arkos-latest.zip');
      console.log('Download cancelled');
    } else {
      console.log('Download complete');
      event.sender.send('updateDownloadProgress', {percentage: 1.0, size: {}});
      event.sender.send('downloadComplete');
    }
  })
  .pipe(fs.createWriteStream('/tmp/arkos-latest.zip'));
};

ipc.on('startIntegrityCheck', function(event, hashUrl) {
  console.log('Starting integrity check');
  mainWindow.setProgressBar(2);
  var sha256sum = crypto.createHash('sha256');
  var f         = fs.ReadStream('/tmp/arkos-latest.zip');
  f.on('data', function(data) {
    if (processAbortFlag) {
      f.destroy();
    }
    sha256sum.update(data);
  });
  f.on('close', function() {
    if (processAbortFlag) {
      console.log('Integrity check aborted');
      processAbortFlag = false;
    }
  });
  f.on('end', function() {
    var digest = sha256sum.digest('hex');
    request(hashUrl, function(err, resp, body) {
      if (processAbortFlag) {
        console.log('Integrity check aborted');
        processAbortFlag = false;
      } else if (err) {
        console.log('Integrity check error: ' + err);
        dialog.showErrorBox('Integrity Check Error', err.message);
        mainWindow.loadURL(emberAppLocation);
      } else if (resp.statusCode !== 200) {
        console.log('Integrity check error: HTTP ' + resp.statusCode);
        dialog.showErrorBox('Integrity Check Error', 'HTTP ' + resp.statusCode);
        mainWindow.loadURL(emberAppLocation);
      } else if (body.split('  ')[0] !== digest) {
        fs.unlink('/tmp/arkos-latest.zip');
        console.log('Integrity check FAILED');
        event.sender.send('integrityCheckComplete', 'fail');
        dialog.showErrorBox('Integrity Check Error', 'The integrity check for this file failed. It may have been corrupted during the download, or an updated version may be available from arkOS. It will now be removed. Please try your install again.');
        mainWindow.loadURL(emberAppLocation);
      } else {
        console.log('Integrity check PASSED');
        event.sender.send('integrityCheckComplete', 'pass');
      }
      mainWindow.setProgressBar(-1);
    });
  });
});

ipc.on('startExtraction', function(event) {
  var images = {};
  console.log('Starting archive extraction');
  event.sender.send('extractionStarted');

  var imgs = child_process.execSync('unzip -l /tmp/arkos-latest.zip', {encoding: 'utf8'});
  imgs.split('\n').forEach(function(line) {
    if (line.endsWith('.img')) {
      line = line.split(' ');
      var name = line[line.length - 1];
      if (name.indexOf('-boot-') >= 0 || name.indexOf('-data-') === -1) {
        images.boot = {name: name, size: line[0]};
      } else {
        images.data = {name: name, size: line[0]};
      }
    }
  });

  extractImage(images.boot, event, function() {
    if (processAbortFlag) {
      return;
    } else if (images.data) {
      extractImage(images.data, event, function() {
        console.log('Archive extraction complete');
        event.sender.send('extractionComplete', 'pass', images.boot.name, images.data.name);
      });
    } else {
      console.log('Archive extraction complete');
      event.sender.send('extractionComplete', 'pass', images.boot.name, null);
    }
  });

  processAbortFlag = false;
});

var extractImage = function(img, event, callback) {
  var hadError = '';
  var progress = {byteCount: 0, totalBytes: img.size, percent: 0};
  var writeStream = fs.createWriteStream('/tmp/' + img.name);
  var reportProgress = setInterval(function() {
    event.sender.send('updateWriteProgress', progress);
    mainWindow.setProgressBar((progress.byteCount / progress.totalBytes));
  }, 1000);
  var proc = child_process.spawn('unzip', ['-p', '/tmp/arkos-latest.zip', img.name]);
  proc.stdout.pipe(writeStream);
  proc.stdout.on('data', function(data) {
    if (processAbortFlag) {
      proc.stdout.unpipe();
      proc.kill();
    } else {
      progress.byteCount += data.length;
      progress.percent = ((progress.byteCount / progress.totalBytes * 100) | 0);
    }
  });
  proc.stderr.on('data', function(err) {
    hadError += err;
  });
  proc.on('close', function(code) {
    clearInterval(reportProgress);
    mainWindow.setProgressBar(-1);
    event.sender.send('updateWriteProgress', null);
    if ([0, 1, 80].indexOf(code) === -1) {
      console.log(hadError || code);
      console.log('Archive extraction failed');
      processAbortFlag = true;
      dialog.showErrorBox('Archive extraction failed', hadError || code.toString());
      mainWindow.loadURL(emberAppLocation);
    } else if (processAbortFlag) {
      console.log('Archive extraction aborted');
    } else {
      callback();
    }
  });
};

ipc.on('writeDisks', function(event, image1, device1, image2, device2) {
  var cmd;
  var stderr = '';
  switch(process.platform) {
    case 'darwin':
      var dev1 = '/dev/rdisk' + device1.slice(-1)[0];
      var dev2 = '/dev/rdisk' + device2.slice(-1)[0];
      cmd = `"${__dirname}/scripts/disk-write-osx.sh" ${dev1} /tmp/${image1}`;
      if (dev2 && image2) {
        cmd += ` ${dev2} /tmp/${image2}`;
      }
      break;
    default:
      // linux
      cmd = `"${__dirname}/scripts/disk-write-linux.sh" ${device1} /tmp/${image1}`;
      if (device2 && image2) {
        cmd += ` ${device2} /tmp/${image2}`;
      }
      break;
  }
  var options = {
    name: 'arkOS Assistant',
    icns: `${__dirname}/dist/img/icon.icns`,
    process: {
      on: function(ps) {
        ps.stderr.on('data', function(data) {
          if (data) {
            stderr += data;
          }
        });
        ps.on('close', function(code) {
          mainWindow.setProgressBar(-1);
          event.sender.send('updateWriteProgress', null);
          if (code === 0) {
            console.log('Disk write complete');
            event.sender.send('diskWriteDone', 'pass');
          }
        });
      }
    }
  };

  // launch write commands
  console.log('Beginning disk write');
  mainWindow.setProgressBar(2);
  event.sender.send('updateWriteProgress', {percent: 100});
  sudo.exec(cmd, options, function(err) {
    if (stderr !== 'sudo: a password is required\n') {
      mainWindow.setProgressBar(-1);
      event.sender.send('updateWriteProgress', null);
      console.log('Disk write failed: ' + err ? err : stderr);
      dialog.showErrorBox('Disk Write Error', err ? err : stderr);
      mainWindow.loadURL(emberAppLocation);
    }
  });
});

ipc.on('removeDownloadedFiles', function() {
  var images = [];

  fs.stat('/tmp/arkos-latest.zip', function(err, stats) {
    if (stats && stats.isFile()) {
      var imgs = child_process.execSync('unzip -l /tmp/arkos-latest.zip', {encoding: 'utf8'});
      imgs.split('\n').forEach(function(line) {
        if (line.endsWith('.img')) {
          images.push(line[line.length - 1]);
        }
      });
      fs.unlink('/tmp/arkos-latest.zip');
    }
  });

  images.forEach(function(image) {
    fs.stat('/tmp/' + image, function(err, stats) {
      if (stats && stats.isFile()) {
        fs.unlink('/tmp/' + image);
      }
    });
  });
});
