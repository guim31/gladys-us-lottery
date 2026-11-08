# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-08

### Added

- Powerball and Mega Millions winning numbers from the open data of the State
  of New York (data.ny.gov), read once an hour: one device per game with the
  last draw (date, numbers, Power Play, Double Play), the next draw in the
  time zone of Gladys, and "draw today" / "draw tomorrow".
- Your lines, checked at every draw: numbers matched by the best line, prize
  tier (1 to 9), winning lines and a summary.
- Scene triggers "New draw published", "Numbers matched" and "Winning line",
  and the scene action "Read the last draw" (a sentence ready to send).
- The "US lotteries" dashboard widget: last numbers, result of your lines,
  next draws.
- English, French, German and Spanish texts and documentation.

[Unreleased]: https://github.com/guim31/gladys-us-lottery/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-us-lottery/releases/tag/v1.0.0
