#!/usr/bin/env node
/* eslint-disable no-console */

const chalk = require('chalk');
const fs = require('fs');
const stringify = require('csv-stringify');
const { program } = require('commander');

const lib = require('./lib.js');
const pkg = require('./package.json');

// Utility methods to store tabular data

const convertToCsv = (data) => {
  return new Promise((resolve, reject) => {
    stringify(
      data,
      {
        header: true,
        quoted: true,
      },
      (error, output) => {
        if (error) {
          reject(error);
        } else {
          resolve(output);
        }
      },
    );
  });
};

const convertToJson = (data) => {
  return new Promise((resolve, reject) => {
    try {
      resolve(JSON.stringify(data));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });
};

// Main method executing the analysis command

async function main() {
  const { analyses, configuration } = lib.___;
  let result;

  program
    .storeOptionsAsProperties()
    .version(pkg.version)
    .description(pkg.description)
    .option(
      '-e, --endpoint <url>',
      'graphQL subgraph endpoint',
      configuration.endpoint,
    )
    .option(
      '-f, --format <csv|json>',
      'file format of output file',
      configuration.format,
    )
    .option('-o, --output <path>', 'optional file output for tabular data')
    .option(
      '-s, --relayer_address <str>',
      'address of relayer funder',
      configuration.relayerAddress,
    );

  Object.keys(analyses).forEach((name) => {
    program
      .command(name)
      .description(analyses[name].description)
      .action(async (_, options, commands) => {
        console.log(
          chalk.bold(`Analyse "${name}" (${analyses[name].description}):`),
        );

        // Set configuration
        lib.setConfiguration({
          endpoint: options.parent.endpoint,
          format: options.parent.format,
          relayerAddress: options.parent.relayer_address,
          log: console.log,
        });

        // Execute command!
        try {
          result = await analyses[name].command(options);
        } catch (error) {
          console.error(chalk.red(error));
          process.exit(1);
        }
      });
  });

  await program.parseAsync(process.argv);

  if (!result) {
    console.error(chalk.red('Error: Invalid result!'));
    process.exit(1);
  }

  console.log(`Done processing ${result.length} data entries total!`);

  if (program.output) {
    try {
      let fileContent;

      if (configuration.format === 'csv') {
        fileContent = await convertToCsv(result);
      } else if (configuration.format === 'json') {
        fileContent = await convertToJson(result);
      } else {
        throw new Error('Invalid export format');
      }

      fs.writeFile(program.output, fileContent, (error) => {
        if (error) {
          throw error;
        }

        console.log(`Stored results in ${program.output}`);
      });
    } catch (error) {
      console.error(chalk.red(error));
      process.exit(1);
    }
  }
}

main();
