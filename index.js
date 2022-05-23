import { program } from 'commander';
import { transform } from './transform.js';


program
  .option('-c, --config <path>');

program
  .command('bitcrush <inputFile> <outputPath>')
  .description('Run the bitcrusher spatial audio effect over the input file')
  .action(async (inputFile, outputPath) => {
    console.log(inputFile, outputPath, program.opts());
    await transform(inputFile, (x) => x, outputPath);
    console.log('done');
  });

program
  .command('distort <inputFile> <outputPath>')
  .description('Run the distortion spatial audio effect over the input file')
  .action((inputFile, outputPath) => {
    console.log(inputFile, outputPath, program.opts());
  });

program.parse();
