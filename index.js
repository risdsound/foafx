#!/usr//bin/env node

import invariant from 'invariant';
import wavefile from 'wavefile';
import OfflineRenderer from '@elemaudio/offline-renderer';

import { readFileSync, writeFileSync } from 'fs';
import { program } from 'commander';
import { defineTransform, decodeAudioData, enc } from './transform.js';
import { bitcrush } from './effects/bitcrush.js';
import { distortion } from './effects/distortion.js';
import { delay } from './effects/delay.js';
import { flanger } from './effects/flanger.js';
import { chorus } from './effects/chorus.js';
import { gain } from './effects/gain.js';


const defaults = {
  bitcrush: {
    bitDepth: 5,
    position: {
      azimuth: 0,
      elevation: 0,
      influence: 0.5,
    },
  },
  distortion: {
    inputGain: 20,
    outputGain: -10,
    position: {
      azimuth: 0,
      elevation: 0,
      influence: 0.5,
    },
  },
  delay: {
    delayTime: 500,
    feedback: 0.8,
    position: {
      azimuth: 90,
      elevation: 0,
      influence: 0.5,
    },
  },
  flanger: {
    rate: 0.2,
    depth: 3.5,
    feedback: 0.4,
    position: {
      azimuth: -90,
      elevation: 0,
      influence: 0.5,
    },
  },
  chorus: {
    rate: 0.5,
    depth: 40,
    position: {
      azimuth: -90,
      elevation: 0,
      influence: 0.5,
    },
  },
  gain: {
    gainDecibels: 0.0,
    position: {
      azimuth: 0,
      elevation: 0,
      influence: 0.5,
    },
  },
};

function loadConfig(programOpts) {
  try {
    if (programOpts.hasOwnProperty('config') && typeof programOpts.config === 'string') {
      let config = JSON.parse(readFileSync(programOpts.config, 'utf-8'));
      return Object.assign({}, defaults, config);
    }
  } catch(e) {
    console.error('Failed to load config:', e.message);
    console.log();
    console.log('Falling back to defaults...');
  }

  return defaults;
}

function loadNormalizationType(programOpts) {
  if (programOpts.hasOwnProperty('norm') && typeof programOpts.norm === 'string') {
    switch (programOpts.norm.toLowerCase()) {
      case 'n3d':
        return 'n3d';
      case 'sn3d':
        return 'sn3d';
      default:
        break;
    }
  }

  return 'sn3d';
}

function checkPosition(pos) {
  invariant(typeof pos === 'object', 'Position object must be specified in the config file.');
  invariant(typeof pos.azimuth === 'number', 'Position object must specify an azimuth value in degrees.');
  invariant(typeof pos.elevation === 'number', 'Position object must specify an elevation value in degrees.');
  invariant(typeof pos.influence === 'number', 'Position object must specify an influence value in degrees.');
}

// Our main transform function.
//
// Takes an input file, an effect function, and a desired output
// path for the resulting wav file.
//
// The effect function is an Elementary function which receives
// an input channel, performs some process over it, and returns
// the output. This function should operate over a single channel.
//
// The position is an object specifying azimuth, elevation, and influence
// relating to the effect. The effect is 100% wet at the specified position
// in the virtual sphere, and 100% dry outside of the sphere of influence around
// that point. The sphere of influence is specified by the influence property
// which defines the radius of the sphere. The virtual sphere in which the sphere
// of influence sits is defined as a unit sphere.
export async function transform(inputFile, normType, position, effect, outputPath) {
  let core = new OfflineRenderer();
  let inputData = decodeAudioData(inputFile);
  let outputWav = new wavefile.WaveFile();

  await core.initialize({
    numInputChannels: inputData.channelData.length,
    numOutputChannels: inputData.channelData.length,
    sampleRate: inputData.sampleRate,
  });

  // Our sample data for processing.
  let inps = inputData.channelData;
  let outs = Array.from({length: inps.length}).map(_ => new Float32Array(inps[0].length));;

  // Our processing transformation
  //
  // For first order processing, we're just using the spatial positions of a
  // default octahedron decoder. These are [azim, elev] pairs in degrees.
  const pos = [ [0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90] ];
  const inTaps = inps.map((x, i) => el.in({channel: i}));

  core.render(...defineTransform(normType, position, effect, inTaps));

  // Pushing samples through the graph
  core.process(inps, outs);

  // Fill our output wav buffer with the process data and write to disk.
  // Here we convert back to 16-bit PCM before write.
  outputWav.fromScratch(inps.length, inputData.sampleRate, '16', outs.map((chan) => {
    return Int16Array.from(chan, x => x * (2 ** 15));
  }));

  writeFileSync(outputPath, outputWav.toBuffer());
}

program
  .option('-n, --norm <type>', 'Either "n3d" or "sn3d" (default "sn3d") matching the input file encoding')
  .option('-c, --config <path>', 'Load a configuration file to override the default parameter settings');

program
  .command('bitcrush <inputFile> <outputPath>')
  .description('Run the bitcrusher spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.bitcrush;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => bitcrush(props, x), outputPath);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program
  .command('distort <inputFile> <outputPath>')
  .description('Run the distortion spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.distortion;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => distortion(props, x), outputPath);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program
  .command('delay <inputFile> <outputPath>')
  .description('Run the delay spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.delay;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => delay(props, x), outputPath);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program
  .command('flange <inputFile> <outputPath>')
  .description('Run the flanger spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.flanger;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => flanger(props, x), outputPath);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program
  .command('chorus <inputFile> <outputPath>')
  .description('Run the chorus spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.chorus;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => chorus(props, x), outputPath);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program
  .command('gain <inputFile> <outputPath>')
  .description('Run the gain spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.gain;

    try {
      checkPosition(position);
      await transform(inputFile, normType, position, (x) => gain(props, x), outputPath);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }

    console.log(`Writing ${outputPath}`);
  });

program.parse();
