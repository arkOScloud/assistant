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
const path             = require('path');
const yauzl            = require('yauzl');
const Transform        = require("stream").Transform;
const drivelist        = require('drivelist');
const request          = require('request');
const readline         = require('readline');
const requestProgress  = require('request-progress');

let mainWindow = null;
let isDownloading = false;
let processAbortFlag = false;
let zipPath = path.join(app.getPath('downloads'), 'arkos-latest.zip');

electron.crashReporter.start();

app.on('window-all-closed', function onWindowAllClosed() {
  app.quit();
});

app.on('ready', function onReady() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + 'dist/includes/icon.png'
  });

  if (process.platform === "linux" && process.env.PATH.indexOf(":/sbin") === -1) {
    process.env.PATH = process.env.PATH += ":/sbin";
  }

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
  fs.stat(zipPath, function(err, stats) {
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
      fs.unlink(zipPath);
      console.log('Download cancelled');
    } else {
      console.log('Download complete');
      event.sender.send('updateDownloadProgress', {percentage: 1.0, size: {}});
      event.sender.send('downloadComplete');
    }
  })
  .pipe(fs.createWriteStream(zipPath));
};

ipc.on('startIntegrityCheck', function(event, hashUrl) {
  console.log('Starting integrity check');
  mainWindow.setProgressBar(0);
  event.sender.send('updateWriteProgress', {percent: 0});
  var checkProgress = {byteCount: 0, totalBytes: fs.statSync(zipPath).size};
  var sha256sum = crypto.createHash('sha256');
  var f         = fs.ReadStream(zipPath);
  var pct;
  f.on('data', function(data) {
    if (processAbortFlag) {
      f.destroy();
    }
    checkProgress.byteCount += data.length;
    pct = Math.round(checkProgress.byteCount / checkProgress.totalBytes);
    mainWindow.setProgressBar(pct);
    event.sender.send('updateWriteProgress', {percent: pct * 100});
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
        fs.unlink(zipPath);
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

  yauzl.open(zipPath, {lazyEntries: true}, function(err, zipfile) {
    if (err) {
      throw err;
    }
    zipfile.readEntry();
    zipfile.on("close", function() {
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
    });
    zipfile.on("entry", function(entry) {
      if (entry.fileName.indexOf('-boot-') >= 0 || entry.fileName.indexOf('-data-') === -1) {
        images.boot = {name: entry.fileName, size: entry.uncompressedSize};
      } else {
        images.data = {name: entry.fileName, size: entry.uncompressedSize};
      }
      zipfile.readEntry();
    });
    zipfile.on("error", function(err) {
      console.log(err);
      console.log('Archive check failed');
      processAbortFlag = true;
      dialog.showErrorBox('Archive check failed', err);
      mainWindow.loadURL(emberAppLocation);
    });
  });

  processAbortFlag = false;
});

var extractImage = function(img, event, callback) {
  var progress = {byteCount: 0, totalBytes: img.size, percent: 0};
  var outPath = path.join(app.getPath('downloads'), img.name);
  console.log('Extracting image: ' + JSON.stringify(img));

  yauzl.open(zipPath, {lazyEntries: true}, function(err, zipfile) {
    if (err) {
      throw err;
    }
    zipfile.readEntry();
    zipfile.on("close", function() {
      mainWindow.setProgressBar(-1);
      event.sender.send('updateWriteProgress', null);
      if (processAbortFlag) {
        console.log('Archive extraction aborted');
        processAbortFlag = false;
      } else {
        callback();
      }
    });
    zipfile.on("entry", function(entry) {
      if (entry.fileName !== img.name) {
        zipfile.readEntry();
      } else {
        zipfile.openReadStream(entry, function(err, readStream) {
          if (err) {
            throw err;
          }
          event.sender.send('updateWriteProgress', progress);
          var reportProgress = setInterval(function() {
            event.sender.send('updateWriteProgress', progress);
            mainWindow.setProgressBar((progress.byteCount / progress.totalBytes));
          }, 1000);
          var filter = new Transform();
          filter._transform = function(chunk, encoding, cb) {
            if (processAbortFlag) {
              clearInterval(reportProgress);
              readStream.unpipe();
              readStream.destroy();
              zipfile.close();
            }
            progress.byteCount += chunk.length;
            progress.percent = Math.round(progress.byteCount / progress.totalBytes * 10000) / 100;
            cb(null, chunk);
          };
          filter._flush = function(cb) {
            clearInterval(reportProgress);
            cb();
            zipfile.readEntry();
          };
          var writeStream = fs.createWriteStream(outPath);
          var filterPipe = readStream.pipe(filter);
          filterPipe.pipe(writeStream);
        });
      }
    });
    zipfile.on("error", function(err) {
      event.sender.send('updateWriteProgress', null);
      mainWindow.setProgressBar(-1);
      console.log(err);
      console.log('Archive extraction failed');
      processAbortFlag = true;
      dialog.showErrorBox('Archive extraction failed', err);
      mainWindow.loadURL(emberAppLocation);
    });
  });
};

ipc.on('writeDisks', function(event, image1, device1, image2, device2) {
  var stderr = '';
  image1 = path.join(app.getPath('downloads'), image1);
  image2 = image2 ? path.join(app.getPath('downloads'), image2) : null;
  if (process.platform === 'darwin') {
    device1.device = '/dev/rdisk' + device1.device.slice(-1)[0];
    if (device2) {
      device2.device = '/dev/rdisk' + device2.device.slice(-1)[0];
    }
  }
  var cmd = `node "${__dirname}/includes/disk-write.js" ${process.platform} ${device1.device} ${image1} ${device1.mountpoint}`;
  if (device2 && image2) {
    cmd += ` ${device2.device} ${image2} ${device2.mountpoint}`;
  }
  console.log('Command will be: ' + cmd);
  var options = {
    name: 'arkOS Assistant',
    icns: `${__dirname}/includes/icon.icns`,
    process: {
      on: function(ps) {
        readline.createInterface({
          input     : ps.stdout,
          terminal  : false
        }).on('line', function(line) {
          if (processAbortFlag) {
            ps.stdout.unpipe();
            ps.kill();
          } else {
            if (line.startsWith('{') && line.endsWith('}')) {
              var progress = JSON.parse(line);
              if (progress) {
                mainWindow.setProgressBar(progress.percent / 100);
              }
              event.sender.send('updateWriteProgress', progress);
            }
          }
        });
        ps.stderr.on('data', function(data) {
          if (data) {
            stderr += data;
          }
        });
        ps.on('close', function(code) {
          if (code === 0) {
            mainWindow.setProgressBar(-1);
            event.sender.send('updateWriteProgress', null);
            console.log('Disk write complete');
            event.sender.send('diskWriteDone', 'pass');
          } else if (processAbortFlag) {
            console.log('Disk write aborted');
            processAbortFlag = false;
          } else {
            onWriteError(stderr);
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
    mainWindow.setProgressBar(-1);
    event.sender.send('updateWriteProgress', null);
    if (err) {
      onWriteError(err);
    }
  });
});

var onWriteError = function(err) {
  err = typeof err === "string" ? err : err.toString();
  if (err && err !== 'sudo: a password is required\n' && err !== 'null') {
    console.log('Disk write failed: ' + err);
    dialog.showErrorBox('Disk Write Error', err);
    mainWindow.loadURL(emberAppLocation);
  }
};

ipc.on('removeDownloadedFiles', function() {
  fs.stat(zipPath, function(err, stats) {
    if (stats && stats.isFile()) {
      yauzl.open(zipPath, {lazyEntries: true}, function(err, zipfile) {
        zipfile.readEntry();
        zipfile.on("close", function() {
          fs.unlink(zipPath);
        });
        zipfile.on("entry", function(entry) {
          var imgPath = path.join(app.getPath('downloads'), entry.fileName);
          fs.stat(imgPath, function(err, stats) {
            if (stats && stats.isFile()) {
              fs.unlink(imgPath);
            }
          });
          zipfile.readEntry();
        });
      });
    }
  });
});
