#!/usr//bin/env node

import { readFileSync } from 'fs';
import { program } from 'commander';
import { transform } from './transform.js';
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
      return Object.assign({}, defaults, config.effects);
    }
  } catch(e) {
    console.error('Failed to load config:', e);
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

program
  .option('-n, --norm <type>', 'Either "n3d" or "sn3d" matching the input file encoding')
  .option('-c, --config <path>', 'Load a configuration file to override the default parameter settings');

program
  .command('bitcrush <inputFile> <outputPath>')
  .description('Run the bitcrusher spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const normType = loadNormalizationType(program.opts());
    const { position, ...props } = config.bitcrush;

    await transform(inputFile, normType, position, (x) => bitcrush(props, x), outputPath);

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

    await transform(inputFile, normType, position, (x) => distortion(props, x), outputPath);

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

    await transform(inputFile, normType, position, (x) => delay(props, x), outputPath);

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

    await transform(inputFile, normType, position, (x) => flanger(props, x), outputPath);

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

    await transform(inputFile, normType, position, (x) => chorus(props, x), outputPath);

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

    await transform(inputFile, normType, position, (x) => gain(props, x), outputPath);

    console.log(`Writing ${outputPath}`);
  });

program.parse();
