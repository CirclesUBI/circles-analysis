<div align="center">
	<img width="80" src="https://raw.githubusercontent.com/CirclesUBI/.github/main/assets/logo.svg" />
</div>

<h1 align="center">circles-analysis</h1>

<div align="center">
 <strong>
   Analysis and statistics toolkit for Circles 
 </strong>
</div>

<br />

<div align="center">
  <!-- npm -->
  <a href="https://www.npmjs.com/package/@circles/analysis">
    <img src="https://img.shields.io/npm/v/@circles/analysis?style=flat-square&color=%23f14d48" height="18">
  </a>
  <!-- Licence -->
  <a href="https://github.com/CirclesUBI/circles-analysis/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/CirclesUBI/circles-analysis?style=flat-square&color=%23cc1e66" alt="License" height="18">
  </a>
  <!-- Discourse -->
  <a href="https://aboutcircles.com/">
    <img src="https://img.shields.io/discourse/topics?server=https%3A%2F%2Faboutcircles.com%2F&style=flat-square&color=%23faad26" alt="chat" height="18"/>
  </a>
  <!-- Twitter -->
  <a href="https://twitter.com/CirclesUBI">
    <img src="https://img.shields.io/twitter/follow/circlesubi.svg?label=twitter&style=flat-square&color=%23f14d48" alt="Follow Circles" height="18">
  </a>
</div>

<div align="center">
  <h3>
    <a href="https://handbook.joincircles.net">
      Handbook
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/circles-analysis/releases">
      Releases
    </a>
    <span> | </span>
    <a href="https://github.com/CirclesUBI/.github/blob/main/CONTRIBUTING.md">
      Contributing
    </a>
  </h3>
</div>

<br/>

Analysis and statistics toolkit for [`Circles`], displaying basic metrics and exporting tabular data for further analysis in .csv or .json format.

[`circles`]: https://joincircles.net

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

```bash
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
  transfers                 regular transfer transactions including: transfer steps, ubi payouts, and gas fees
  trusts                    trust connection events
  ownerships                safe ownership events / device changes
  safes                     safe deployments and balances
  velocity                  transfer velocity
  help [command]            display help for command
```

## Development

```bash
# Install dependencies
npm install

# Run commands like ..
node ./index.js --output results.csv velocity
```

```javascript
// Import methods like ..
import analysis from '@circles/analysis';

analysis.setConfiguration({
 safeAddress: '...',
 endpoint: '...',
});

const velocity = await analysis.getVelocity();
```

## License

GNU Affero General Public License v3.0 [`AGPL-3.0`]

[`AGPL-3.0`]: LICENSE
