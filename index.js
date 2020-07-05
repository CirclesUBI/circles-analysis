#!/usr/bin/env node
/* eslint-disable no-console */

const BN = require('bn.js');
const chalk = require('chalk');
const web3 = require('web3');
const { Interval, DateTime } = require('luxon');
const { request } = require('graphql-request');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const PAGINATION_SIZE = 500;

const configuration = {
  endpoint:
    'https://graph.circles.garden/subgraphs/name/CirclesUBI/circles-subgraph',
  safeAddress: '0x812d4e73eb6b8200a62469ec3249fb02eac58c91',
  format: 'csv',
};

function setConfiguration(customConfiguration) {
  const { endpoint, safeAddress, format } = Object.assign(
    {},
    configuration,
    customConfiguration
  );

  configuration.endpoint = endpoint;
  configuration.safeAddress = safeAddress;
  configuration.format = format;
}

require('cross-fetch/polyfill');
const pkg = require('./package.json');

// Utility methods to display results

function print(title, value) {
  if (require.main !== module) {
    return;
  }

  console.log(`◆ ${chalk.blue(title)}: ${value}`);
}

function weiToCircles(wei) {
  return web3.utils.fromWei(wei, 'ether');
}

// Utility methods to fetch data

async function fetchFromGraph(
  name,
  fields,
  extra = '',
  skip = 0,
  first = PAGINATION_SIZE
) {
  const query = `{
    ${name}(${extra} first: ${first}, skip: ${skip}) {
      ${fields}
    }
  }`;

  const data = await request(
    configuration.endpoint,
    query.replace(/\s\s+/g, ' ')
  );
  return data[name];
}

async function* fetchGraphGenerator(name, fields, extra = '') {
  let skip = 0;
  let hasData = true;

  while (hasData) {
    const data = await fetchFromGraph(name, fields, extra, skip);
    hasData = data.length > 0;
    skip += PAGINATION_SIZE;
    yield data;
  }
}

async function fetchAllFromGraph(name, fields, extra = '') {
  let result = [];
  let index = 0;

  console.log(`Request all "${name}" data from Graph ...`);

  for await (let data of fetchGraphGenerator(name, fields, extra)) {
    result = result.concat(
      data.map((entry) => {
        entry.index = ++index;
        return entry;
      })
    );
  }

  return result;
}

// Utility methods to analyse data

const avg = (arr) => arr.reduce((acc, x) => acc + x, 0) / arr.length;

const avgBN = (arr) => {
  const total = arr.reduce((acc, x) => acc.add(new BN(x)), new BN());
  return total.divn(arr.length);
};

const maxBN = (arr) => arr.reduce((acc, x) => BN.max(acc, new BN(x)), new BN());

const count = (arr) => {
  return arr.reduce((acc, item) => {
    Object.keys(item).forEach((key) => {
      if (!(key in acc)) {
        acc[key] = {};
      }

      if (!(item[key] in acc[key])) {
        acc[key][item[key]] = 0;
      }

      acc[key][item[key]] += 1;
    });

    return acc;
  }, {});
};

const pick = (arr, key) => arr.map((item) => item[key]);

// The actual analysis commands

const analyses = {
  transitive: {
    description: 'transitive transactions in the Circles hub',
    command: async () => {
      const hubTransfers = await fetchAllFromGraph(
        'hubTransfers',
        'id from to amount'
      );

      print(
        'Average amount',
        weiToCircles(avgBN(pick(hubTransfers, 'amount')))
      );
      print(
        'Average total received transfers per user',
        avg(Object.values(count(hubTransfers).from))
      );
      print(
        'Max total received transfers per user',
        Math.max(...Object.values(count(hubTransfers).to))
      );

      return hubTransfers;
    },
  },
  transfers: {
    description:
      'regular transfer transactions including ubi payouts and gas fees',
    command: async () => {
      const transfers = await fetchAllFromGraph(
        'transfers',
        'id from to amount'
      );

      const ubiPayouts = transfers.filter((item) => {
        return item.from === ZERO_ADDRESS;
      });

      const gasFees = transfers.filter((item) => {
        return item.to === configuration.safeAddress;
      });

      const gasFeesSum = gasFees.reduce((acc, item) => {
        return acc.add(new BN(item.amount));
      }, new BN());

      print('Average amount', weiToCircles(avgBN(pick(transfers, 'amount'))));
      print(
        'Average UBI payout amount',
        weiToCircles(avgBN(pick(ubiPayouts, 'amount')))
      );
      print('UBI payouts count', ubiPayouts.length);
      print('Total gas fees amount (in wei)', gasFeesSum);
      print('Average gas fees amount (in wei)', avgBN(pick(gasFees, 'amount')));

      return transfers;
    },
  },
  trusts: {
    description: 'trust connection events',
    command: async () => {
      const trusts = await fetchAllFromGraph(
        'trusts',
        'id canSendToAddress userAddress limit limitPercentage'
      );

      const revokedTrusts = trusts.filter((item) => {
        return item.limitPercentage === '0';
      });

      const createdTrusts = trusts.filter((item) => {
        return item.limitPercentage !== '0';
      });

      print('Created trust connections', createdTrusts.length);
      print('Revoked trust connections', revokedTrusts.length);
      print(
        'Average outgoing trust connections',
        avg(Object.values(count(createdTrusts).canSendToAddress))
      );
      print(
        'Average incoming trust connections',
        avg(Object.values(count(createdTrusts).userAddress))
      );
      print(
        'Max outgoing trust connections',
        Math.max(...Object.values(count(createdTrusts).userAddress))
      );
      print(
        'Max incoming trust connections',
        Math.max(...Object.values(count(createdTrusts).canSendToAddress))
      );

      return trusts;
    },
  },
  ownerships: {
    description: 'safe ownership events / device changes',
    command: async () => {
      const ownershipChanges = await fetchAllFromGraph(
        'ownershipChanges',
        'id adds removes'
      );
      const safes = await fetchAllFromGraph('safes', 'id');

      const adds = ownershipChanges.filter((item) => {
        return item.adds;
      });

      const removals = ownershipChanges.filter((item) => {
        return item.removes;
      });

      print('Added devices total', adds.length);
      print('Manually removed devices', removals.length);
      print('Manually added devices', adds.length - safes.length);
      print('Deployed Safes total', safes.length);

      return ownershipChanges;
    },
  },
  safes: {
    description: 'safe deployments and balances',
    command: async () => {
      const safes = await fetchAllFromGraph('safes', 'id balances { amount }');

      print('Deployed Safes total', safes.length);

      const totalBalance = safes.reduce((acc, safe) => {
        acc[safe.id] = safe.balances.reduce((safeAcc, balance) => {
          return safeAcc.add(new BN(balance.amount));
        }, new BN());

        return acc;
      }, {});

      print(
        'Average total balance per Safe',
        weiToCircles(avgBN(Object.values(totalBalance)))
      );
      print(
        'Max total balance per Safe',
        weiToCircles(maxBN(Object.values(totalBalance)))
      );

      const safesFormatted = safes.map((safe, index) => {
        return {
          index: index + 1,
          id: safe.id,
          balance: totalBalance[safe.id].toString(10),
        };
      });

      return safesFormatted;
    },
  },
  velocity: {
    description: 'transfer velocity',
    command: async () => {
      const notifications = await fetchAllFromGraph(
        'notifications',
        'id time hubTransfer { id from to amount }',
        'where: { type: HUB_TRANSFER }'
      );

      const data = {};
      let timestampMin = 9999999999999;
      let timestampMax = 0;

      // Summarize transfer amounts per day
      notifications.forEach(({ hubTransfer, time }) => {
        const timestamp = parseInt(`${time}000`);
        timestampMin = Math.min(timestamp, timestampMin);
        timestampMax = Math.max(timestamp, timestampMax);

        const date = DateTime.fromMillis(timestamp);
        const dateFormatted = date.toFormat('yyyy/MM/dd');

        if (!(dateFormatted in data)) {
          data[dateFormatted] = new BN();
        }

        data[dateFormatted] = data[dateFormatted].add(
          new BN(hubTransfer.amount)
        );
      });

      // Fill in days without any transfers
      const interval = Interval.fromDateTimes(
        DateTime.fromMillis(timestampMin),
        DateTime.fromMillis(timestampMax)
      ).splitBy({ days: 1 });

      interval.forEach((intervalDay) => {
        const dateFormatted = intervalDay.start.toFormat('yyyy/MM/dd');

        if (!(dateFormatted in data)) {
          data[dateFormatted] = new BN();
        }
      });

      // Sort dates and add index
      const velocity = Object.keys(data)
        .map((date) => {
          return {
            amount: data[date].toString(10),
            date,
          };
        })
        .sort((itemA, itemB) => itemA.date.localeCompare(itemB.date))
        .map((item, index) => {
          item.index = index + 1;
          return item;
        });

      print('Total days recorded', velocity.length);
      print(
        'Velocity (Circles / Day)',
        weiToCircles(avgBN(pick(velocity, 'amount')))
      );
      print(
        'Max velocity (one day)',
        weiToCircles(maxBN(pick(velocity, 'amount')))
      );

      return velocity;
    },
  },
};

// Main method executing the analysis command

if (require.main === module) {
  const fs = require('fs');
  const stringify = require('csv-stringify');
  const { program } = require('commander');

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
        }
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

  const main = async () => {
    let result;

    Object.keys(analyses).forEach((name) => {
      program
        .command(name)
        .description(analyses[name].description)
        .action(async (options) => {
          console.log(
            chalk.bold(`Analyse "${name}" (${analyses[name].description}):`)
          );

          // Set configuration
          setConfiguration({
            endpoint: options.parent.endpoint,
            format: options.parent.format,
            safeAddress: options.parent.safe_address,
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
  };

  program
    .version(pkg.version)
    .description(pkg.description)
    .option(
      '-e, --endpoint <url>',
      'graphQL subgraph endpoint',
      configuration.endpoint
    )
    .option(
      '-f, --format <csv|json>',
      'file format of output file',
      configuration.format
    )
    .option('-o, --output <path>', 'optional file output for tabular data')
    .option(
      '-s, --safe_address <str>',
      'contract address of relayer safe',
      configuration.safeAddress
    );

  main();
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
  ...Object.keys(analyses).reduce((acc, key) => {
    acc[`get${capitalizeFirstLetter(key)}`] = analyses[key].command;
    return acc;
  }, {}),
  setConfiguration,
};
