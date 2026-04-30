# Changelog

## [0.2.0](https://github.com/gabecmelo/Studdup/compare/studdup-v0.1.0...studdup-v0.2.0) (2026-04-30)


### Features

* add app shell and agenda view with today/tomorrow/upcoming ([ce79b48](https://github.com/gabecmelo/Studdup/commit/ce79b48791cdd201c0b786b585e802a267f210ad))
* add card detail view (read all fields, access actions from one place) ([7f5ebdd](https://github.com/gabecmelo/Studdup/commit/7f5ebddbc42918359c7a1bc3746fcca395c8e8a9))
* add card edit modal (update title, content and review link) ([52b6cef](https://github.com/gabecmelo/Studdup/commit/52b6cefc3cfd66d2fcea7e814d4258a8d85ed09c))
* add card editor with day 0/1 creation and overdue resolution modal ([112f477](https://github.com/gabecmelo/Studdup/commit/112f4777cd126925c606f60ccc551a624b5c45fd))
* add card struct and stage enum with day0-30 ladder ([50df156](https://github.com/gabecmelo/Studdup/commit/50df156da2e4def9d7ce92118126aec24822afa1))
* add date type with local-tz today() and iso conversion ([369bf47](https://github.com/gabecmelo/Studdup/commit/369bf4781ddb71056a85dd9ccf74da7bd7110198))
* add delete card with confirmation dialog ([4830688](https://github.com/gabecmelo/Studdup/commit/48306889be9819343f27e952249fec4735132d21))
* add glfw + opengl3 entry point with hotkey dispatch ([021b6d3](https://github.com/gabecmelo/Studdup/commit/021b6d366075066347928ec779ea535f85c1ebec))
* add help modal listing hotkeys ([08593dc](https://github.com/gabecmelo/Studdup/commit/08593dc8e1e36b1b2effbbd6a871f30cb6ccce40))
* add history view with event log and revive action ([5c63de2](https://github.com/gabecmelo/Studdup/commit/5c63de2a0effb895dc8ee786efcb02ca1d4fb0a4))
* add postpone study and review with 5-min timer warning ([010ff9a](https://github.com/gabecmelo/Studdup/commit/010ff9abdc8dc655b9d2fb222a227ac50d963e8d))
* clickable links, To Study/Review label, Exit dev mode button ([d076c56](https://github.com/gabecmelo/Studdup/commit/d076c56cd770fc42d2b46b3f50a865082779470f))
* dev mode (triple-click Today) with full stage picker on card creation ([3459700](https://github.com/gabecmelo/Studdup/commit/34597009b158e375d3eccfe604899fb367ec0c51))
* implement scheduler stage transitions anchored to startdate ([936a0f1](https://github.com/gabecmelo/Studdup/commit/936a0f1e2a03a5e0f9a8c05b1956b50401c25ee7))
* persist cards and event history via sqlite ([7696f7a](https://github.com/gabecmelo/Studdup/commit/7696f7a5713c85f8bd7e0e8e0b93a89135f467ce))
* rename project to studdup and add version tracking ([fac0550](https://github.com/gabecmelo/Studdup/commit/fac055018e61f434d82a9028cf3f9e295a34477b))


### Bug Fixes

* correct lcov exclude patterns and suppress unused-pattern error ([4076908](https://github.com/gabecmelo/Studdup/commit/40769082e8323228c6ff3cc9607427cd248c0b79))
* define onWindowFocusChanged and silence MSVC strncpy warnings ([9d2f2a7](https://github.com/gabecmelo/Studdup/commit/9d2f2a7a93039c4a400f251a3336527d0578d15c))
* gate app dependencies behind BUILD_APP option to unblock test-only CI ([90d7ddc](https://github.com/gabecmelo/Studdup/commit/90d7ddc962b017425a7f0e574aec7c1240a339f7))
* point release-please to config paths and disable Wayland on CI ([6f6a93f](https://github.com/gabecmelo/Studdup/commit/6f6a93fb47cc4017efea5e2cd412f7088308e518))
* postpone timer No-button, deleteCard error check, run.py UTF-8 output ([07906d8](https://github.com/gabecmelo/Studdup/commit/07906d8938841ecad293e5bfbb03af929a299a07))
* store database in platform user-data dir to survive builds and updates ([d12f2fa](https://github.com/gabecmelo/Studdup/commit/d12f2fa6b98253325b2f89fd6c52f579ebd0a5b2))
