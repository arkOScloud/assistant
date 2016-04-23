/* jshint node: true */

const fs            = require('fs');
const readline      = require('readline');
const child_process = require('child_process');
const imageWrite    = require('resin-image-write');


const platform  = process.argv[2],
      device1   = process.argv[3],
      device2   = process.argv[6],
      image1    = process.argv[4],
      image2    = process.argv[7],
      driveLtr1 = process.argv[5],
      driveLtr2 = process.argv[8];

const newline = process.platform === "win32" ? '\r\n' : '\n';

var dev1Obj = {path: device1, image: image1, letter: driveLtr1};
var dev2Obj = device2 ? {path: device2, image: image2, letter: driveLtr2} : null;

var unmountDisk = function(device) {
  switch (platform) {
    case "darwin":
      child_process.execSync(`diskutil unmountDisk ${device.path}`);
      break;
    case "win32":
      child_process.execSync(`MOUNTVOL ${device.letter} /P`);
      break;
    default:
      // linux
      var lineReader = readline.createInterface({
        input: fs.createReadStream('/etc/mtab')
      });
      lineReader.on('line', function (line) {
        var dpart = line.split(" +");
        if (dpart[1] && dpart[1].startsWith(device.path)) {
          child_process.execSync(`umount -l ${dpart[1]}`);
        }
      });
      break;
  }
};

var writeImage = function(device, nextDevice) {
  unmountDisk(device);
  var stream = fs.createReadStream(device.image);
  stream.length = fs.statSync(device.image).size;
  var writer = imageWrite.write(device.path, stream, {check: true});
  writer.on('progress', function(state) {
    var progress = {percent: (Math.round(state.percentage * 100) / 100)};
    if (state.type !== 'check') {
      progress.byteCount = state.transferred;
      progress.totalBytes = state.length;
    }
    process.stdout.write(JSON.stringify(progress) + newline);
  });
  writer.on('error', function(error) {
    process.stderr.write(`An error occured while writing the image: ${error}` + newline);
    process.exit(1);
  });
  writer.on('done', function(success) {
    process.stdout.write('null' + newline);
    if (success && nextDevice) {
      writeImage(nextDevice);
    } else if (!success) {
      process.stderr.write('The image could not be written. Please verify the integrity of the device and try again.');
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
};

writeImage(dev1Obj, dev2Obj);
