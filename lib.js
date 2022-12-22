const BN = require('bn.js');
const web3 = require('web3');
const { Interval, DateTime } = require('luxon');
const { request } = require('graphql-request');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const PAGINATION_SIZE = 1000;

const configuration = {
  endpoint:
    'https://api.thegraph.com/subgraphs/name/circlesubi/circles-ubi',
  relayerAddress: '0x0739a8D036c966aC9161Ea14855CE0f94C15B87b',
  format: 'csv',
  log: undefined,
};

function setConfiguration(customConfiguration) {
  const { endpoint, relayerAddress, format, log } = Object.keys(
    configuration,
  ).reduce((acc, key) => {
    if (customConfiguration[key]) {
      acc[key] = customConfiguration[key];
    } else {
      acc[key] = configuration[key];
    }
    return acc;
  }, {});

  configuration.endpoint = endpoint;
  configuration.relayerAddress = relayerAddress;
  configuration.format = format;
  configuration.log = log;
}

require('cross-fetch/polyfill');

// Utility methods to display results

function print(message) {
  if (!configuration.log) {
    return;
  }

  configuration.log(...arguments);
}

function weiToCircles(wei) {
  return web3.utils.fromWei(wei, 'ether');
}

// Utility methods to fetch data

async function fetchFromGraph(
  name,
  fields,
  where = '',
  lastID = '',
  first = PAGINATION_SIZE,
) {
  const query = `{
    ${name}(first: ${first}, orderBy: id, where: {id_gt: "${lastID}", ${where}}) {
      ${fields}
    }
  }`;
  console.log(query.replace(/\s\s+/g, ' '));
  const data = await request(
    configuration.endpoint,
    query.replace(/\s\s+/g, ' '),
  );
  return data[name];
}

async function* fetchGraphGenerator(name, fields, where = '') {
  // The `skip` argument must be between 0 and 5000 (current limitations by TheGraph).
  // Therefore, we sort the elements by id and reference the last element id for the next query
  let lastID = '';
  let hasData = true;
  const pageSize = PAGINATION_SIZE;
  let skip = 0;

  while (hasData) {
    const data = await fetchFromGraph(name, fields, where, lastID, pageSize);
    print(
      `Fetched ${data.length} entries for "${name}" from Graph (${skip} - ${
        skip + pageSize
      }})...`,
    );
    hasData = data.length > 0;
    if (hasData) {
      lastID = data[data.length - 1].id;
    }
    skip += PAGINATION_SIZE;
    yield data;
  }
}

async function fetchAllFromGraph(name, fields, where = '') {
  let result = [];
  let index = 0;
  let test = 0;

  print(`Request all "${name}" data from Graph ...`);

  for await (let data of fetchGraphGenerator(name, fields, where)) {
    if (data.length > 0){
      result = result.concat(
        data.map((entry) => {
          entry.index = ++index;
          return entry;
        }),
      );
    }
      
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
      const notifications = await fetchAllFromGraph(
        'notifications',
        'id time hubTransfer { id from to amount }',
        'type: HUB_TRANSFER',
      );

      const hubTransfers = notifications.map(({ hubTransfer, time }) => {
        return {
          amount: hubTransfer.amount,
          from: hubTransfer.from,
          to: hubTransfer.to,
          id: hubTransfer.id,
          time,
        };
      });

      print(
        'Average amount',
        weiToCircles(avgBN(pick(hubTransfers, 'amount'))),
      );
      print(
        'Average total received transfers per user',
        avg(Object.values(count(hubTransfers).from)),
      );
      print(
        'Max total received transfers per user',
        Math.max(...Object.values(count(hubTransfers).to)),
      );

      return hubTransfers;
    },
  },
  timetransfers: {
    description: 'regular transfer transactions including ubi payouts and gas fees with timestamp',
    command: async () => {
      const notifications = await fetchAllFromGraph(
        'notifications',
        'id time transfer { id from to amount }',
        'type: TRANSFER',
      );

      const transfers = notifications.map(({ transfer, time }) => {
        return {
          amount: transfer.amount,
          from: transfer.from,
          to: transfer.to,
          id: transfer.id,
          time,
        };
      });

      print(
        'Average amount',
        weiToCircles(avgBN(pick(transfers, 'amount'))),
      );
      print(
        'Average total received transfers per user',
        avg(Object.values(count(transfers).from)),
      );
      print(
        'Max total received transfers per user',
        Math.max(...Object.values(count(transfers).to)),
      );

      return transfers;
    },
  },
  transfers: {
    description:
      'regular transfer transactions including ubi payouts and gas fees',
    command: async () => {
      const transfers = await fetchAllFromGraph(
        'transfers',
        'id from to amount',
      );

      const ubiPayouts = transfers.filter((item) => {
        return item.from === ZERO_ADDRESS;
      });

      const gasFees = transfers.filter((item) => {
        return item.to === configuration.relayerAddress;
      });

      const gasFeesSum = gasFees.reduce((acc, item) => {
        return acc.add(new BN(item.amount));
      }, new BN());

      print('Average amount', weiToCircles(avgBN(pick(transfers, 'amount'))));
      print(
        'Average UBI payout amount',
        weiToCircles(avgBN(pick(ubiPayouts, 'amount'))),
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
      const notifications = await fetchAllFromGraph(
        'notifications',
        'id time trust { id canSendTo user limitPercentage }',
        'type: TRUST',
      );

      const trusts = notifications.map(({ trust, time }) => {
        return {
          canSendToAddress: trust.canSendTo,
          userAddress: trust.user,
          limitPercentage: trust.limitPercentage,
          id: trust.id,
          time,
        };
      });

      const revokedTrusts = trusts.filter((item) => {
        return item.limitPercentage === '0';
      });

      const createdTrusts = trusts.filter((item) => {
        return item.limitPercentage !== '0';
      });

      const outgoingTrustConnections = count(createdTrusts).canSendToAddress;
      const incomingTrustConnections = count(createdTrusts).userAddress;

      print('Created trust connections:', createdTrusts.length);
      print('Revoked trust connections:', revokedTrusts.length);
      print(
        'Average outgoing trust connections:',
        avg(Object.values(outgoingTrustConnections)),
      );
      print(
        'Average incoming trust connections:',
        avg(Object.values(incomingTrustConnections)),
      );
      // print(
      //   'Max outgoing trust connections',
      //   Math.max(...Object.values(incomingTrustConnections)),
      // );
      // print(
      //   'Max incoming trust connections',
      //   Math.max(...Object.values(outgoingTrustConnections)),
      // );

      return trusts;
    },
  },
  ownerships: {
    description: 'safe ownership events / device changes',
    command: async () => {
      const ownershipChanges = await fetchAllFromGraph(
        'ownershipChanges',
        'id adds removes',
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
        weiToCircles(avgBN(Object.values(totalBalance))),
      );
      print(
        'Max total balance per Safe',
        weiToCircles(maxBN(Object.values(totalBalance))),
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
  walletDeployedSafes: {
    description: 'safe deployments that are shared wallets',
    command: async () => {
      const safes = await fetchAllFromGraph('safes', 'id', 'deployed: true, organization: true');
      print('Deployed Safes that are Shared Wallets', safes.length);
      const safesFormatted = safes.map((safe, index) => {
        return {
          index: index + 1,
        };
      });
      return safesFormatted;
    },
  },
  userDeployedSafes:{
    description: 'safe deployments that are not shared wallets',
    command: async () => {
      const safes = await fetchAllFromGraph('safes', 'id', 'deployed: true, organization: false');
      print('Deployed Safes that are Individual accounts', safes.length);
      const safesFormatted = safes.map((safe, index) => {
        return {
          index: index + 1,
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
        'type: HUB_TRANSFER',
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
          new BN(hubTransfer.amount),
        );
      });

      // Fill in days without any transfers
      const interval = Interval.fromDateTimes(
        DateTime.fromMillis(timestampMin),
        DateTime.fromMillis(timestampMax),
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
        weiToCircles(avgBN(pick(velocity, 'amount'))),
      );
      print(
        'Max velocity (one day)',
        weiToCircles(maxBN(pick(velocity, 'amount'))),
      );

      return velocity;
    },
  },
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
  ___: {
    analyses,
    configuration,
  },
  ...Object.keys(analyses).reduce((acc, key) => {
    acc[`get${capitalizeFirstLetter(key)}`] = analyses[key].command;
    return acc;
  }, {}),
  setConfiguration,
  utils: {
    avg,
    avgBN,
    count,
    maxBN,
    pick,
    weiToCircles,
  },
};
