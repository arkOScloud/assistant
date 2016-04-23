/* jshint node: true */

const fs            = require('fs');
const child_process = require('child_process');
const imageWrite    = require('resin-image-write');


const platform  = process.argv[2],
      device1   = process.argv[3],
      device2   = process.argv[6],
      image1    = process.argv[4],
      image2    = process.argv[7],
      driveLtr1 = process.argv[5],
      driveLtr2 = process.argv[8];

var stream1 = fs.createReadStream(image1);
stream1.length = fs.statSync(image1).size;
if (image2) {
  var stream2 = fs.createReadStream(image2);
  stream2.length = fs.statSync(image2).size;
}

var dev1Obj = {path: device1, stream: stream1, letter: driveLtr1};
var dev2Obj = device2 ? {path: device2, stream: stream2, letter: driveLtr2} : null;

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
      child_process.execSync(`ls ${device.path}?* | xargs -n1 umount -l`);
      break;
  }
};

var writeImage = function(device, nextDevice) {
  unmountDisk(device);
  var writer = imageWrite.write(device.path, device.stream, {check: true});
  writer.on('progress', function(state) {
    var progress = {percent: (Math.round(state.percentage * 100) / 100)};
    if (state.type !== 'check') {
      progress.byteCount = state.transferred;
      progress.totalBytes = state.length;
    }
    process.stdout.write(JSON.stringify(progress) + '\n');
  });
  writer.on('error', function(error) {
    process.stderr.write(`An error occured while writing the image: ${error}\n`);
    process.exit(1);
  });
  writer.on('done', function(success) {
    process.stdout.write('null\n');
    if (success && nextDevice) {
      writeImage(nextDevice);
    } else if (!success) {
      process.stderr.write('The image could not be written. Please verify the integrity of the device and try again.');
    } else {
      process.exit(0);
    }
  });
};

writeImage(dev1Obj, dev2Obj);
