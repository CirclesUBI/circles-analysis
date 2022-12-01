# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.5.0] - 2022-12-01

### Added

- Add counts for shared wallets and individual accounts [#5](https://github.com/CirclesUBI/circles-analysis/pull/5)

### Fixed

- Fix pagination: substitute `extra` by `where`, and `skip` by `lastID` [#5](https://github.com/CirclesUBI/circles-analysis/pull/5)
- Update subgraph name and endpoint
- Remove operations prohivitive for BIG datasets [#9](https://github.com/CirclesUBI/circles-analysis/pull/9)

## [0.4.0] - 2021-05-03

### Added

- Also store timestamps for Trust and HubTransfer events [#4](https://github.com/CirclesUBI/circles-analysis/pull/4)
