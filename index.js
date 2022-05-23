import { readFileSync } from 'fs';
import { program } from 'commander';
import { transform } from './transform.js';
import { bitcrush } from './effects/bitcrush.js';
import { distortion } from './effects/distortion.js';
import { delay  } from './effects/delay.js';


const defaults = {
  bitcrush: {
    bitDepth: 2,
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
      influence: 0.2,
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

program
  .option('-c, --config <path>');

program
  .command('bitcrush <inputFile> <outputPath>')
  .description('Run the bitcrusher spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const { position, ...props } = config.bitcrush;

    await transform(inputFile, position, (x) => bitcrush(props, x), outputPath);

    console.log(`Writing ${outputPath}`);
  });

program
  .command('distort <inputFile> <outputPath>')
  .description('Run the distortion spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const { position, ...props } = config.distortion;

    await transform(inputFile, position, (x) => distortion(props, x), outputPath);

    console.log(`Writing ${outputPath}`);
  });

program
  .command('delay <inputFile> <outputPath>')
  .description('Run the delay spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(`Processing ${inputFile}...`);

    const config = loadConfig(program.opts());
    const { position, ...props } = config.delay;

    await transform(inputFile, position, (x) => delay(props, x), outputPath);

    console.log(`Writing ${outputPath}`);
  });

program.parse();
