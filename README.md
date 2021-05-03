# Circles Analysis

<p>
  <a href="https://opencollective.com/circles">
    <img src="https://opencollective.com/circles/supporters/badge.svg" alt="Backers">
  </a>
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=follow+circles" alt="Follow Circles">
  </a>
</p>

Analysis and statistics toolkit for [Circles](https://joincircles.net/), displaying basic metrics and exporting tabular data for further analysis in .csv or .json format.

## Example

```
$ circles-analysis --output example.csv --format csv velocity
Analyse "velocity" (transfer velocity):
Request all "notifications" data from Graph ...
◆ Total days recorded: 112
◆ Velocity (Circles / Day): 20.069135714285716134
◆ Max velocity (one day): 553.2
Done processing 112 data entries total!
Stored results in example.csv
```

## Installation

```
npm i -g @circles/analysis
```

## Usage

```
Usage: circles-analysis [options] [command]

Circles statistics and analysis toolkit

Options:
  -V, --version                output the version number
  -e, --endpoint <url>         graphQL subgraph endpoint (default: "https://api.thegraph.com/..")
  -f, --format <csv|json>      file format of output file (default: "csv")
  -o, --output <path>          optional file output for tabular data
  -s, --relayer_address <str>  address of relayer funder (default: "0x0739..")
  -h, --help                   display help for command

Commands:
  transitive                transitive transactions in the Circles hub
  transfers                 regular transfer transactions including ubi payouts and gas fees
  trusts                    trust connection events
  ownerships                safe ownership events / device changes
  safes                     safe deployments and balances
  velocity                  transfer velocity
  help [command]            display help for command
```

## Development

```
// Install dependencies
npm install

// Run commands like ..
node ./index.js --output results.csv velocity

// Import methods like ..
import analysis from '@circles/analysis';

analysis.setConfiguration({
 safeAddress: '...',
 endpoint: '...',
});

const velocity = await analysis.getVelocity();
```

## License

GNU Affero General Public License v3.0 `AGPL-3.0`
