# Changelog

## [0.4.0](https://github.com/gabecmelo/Studdup/compare/studdup-v0.3.1...studdup-v0.4.0) (2026-08-05)


### Features

* **ui:** contextual (?) help for methods and techniques in Novo Card ([11d4cdf](https://github.com/gabecmelo/Studdup/commit/11d4cdf9ea73b3de5a86f53d7c0c3687f18183b1))
* **ui:** make the board read-and-open only, removing drag (AD-016) ([dc77c21](https://github.com/gabecmelo/Studdup/commit/dc77c215d21e505c741da0a1836703969cc74efb))

## [0.3.1](https://github.com/gabecmelo/Studdup/compare/studdup-v0.3.0...studdup-v0.3.1) (2026-08-05)


### Bug Fixes

* **ci:** make the Tauri release build succeed ([fa75a31](https://github.com/gabecmelo/Studdup/commit/fa75a31f10fdb9358253d1f8b99fbba47e937312))

## [0.3.0](https://github.com/gabecmelo/Studdup/compare/studdup-v0.2.0...studdup-v0.3.0) (2026-08-05)


### Features

* add per-technique session defaults and pomodoro rhythm ([3383f78](https://github.com/gabecmelo/Studdup/commit/3383f78dfbc207b760b16f50e67b7b7b5883df9d))
* **app:** desktop icon from the Pilha logo ([d965f48](https://github.com/gabecmelo/Studdup/commit/d965f48953eed867d7b8fd5d024a24172e3f4482))
* **app:** expose attempt commands and query hooks ([ed0a9ef](https://github.com/gabecmelo/Studdup/commit/ed0a9ef060b88fe77d1d51e7c4e6a8fb7faed459))
* **app:** expose core api as tauri commands with generated ts types ([aa8369c](https://github.com/gabecmelo/Studdup/commit/aa8369c434c914d2b0372a8df40f91631759093b))
* **app:** resolve db path and hold migrated connection in state ([53ca0b9](https://github.com/gabecmelo/Studdup/commit/53ca0b92058f983ce2ff2d774e12a08358bb6e2b))
* **core:** add api facade orchestrating scheduler, repo and events ([0e2bf52](https://github.com/gabecmelo/Studdup/commit/0e2bf52f40f00bc89c76872a7af032fcf8c525ca))
* **core:** add attempt domain type and repository ([2b9ac46](https://github.com/gabecmelo/Studdup/commit/2b9ac46d9b4bc64eb7e0f56e89fa7a0b890cdf7e))
* **core:** add attempt record/list api facade ([8795ee4](https://github.com/gabecmelo/Studdup/commit/8795ee478ed89b393544f2980c9c408a0de3abb7))
* **core:** add attempts table and bump schema to v2 ([b90db68](https://github.com/gabecmelo/Studdup/commit/b90db6865e948a529cdcfb87fca6e7f4c551aa3e))
* **core:** add back-loaded exam session distribution ([774941b](https://github.com/gabecmelo/Studdup/commit/774941b59a943aaf794642d75698e29b3c4bbb2d))
* **core:** add backup-first forward schema migration ([98551af](https://github.com/gabecmelo/Studdup/commit/98551afa336ebf93a1e6db61de3c5f7e0318421b))
* **core:** add card repository operations ([0a671d6](https://github.com/gabecmelo/Studdup/commit/0a671d6ca6e7d071c4187e0da4128d11f8c20ad2))
* **core:** add domain enums and entity structs with stage-as-offset ([32646d2](https://github.com/gabecmelo/Studdup/commit/32646d2c3c8de2ea30653bead1743782e4cb5631))
* **core:** add exam and session repository operations ([fd07421](https://github.com/gabecmelo/Studdup/commit/fd07421eef62c5a94eb75cf30f48d8c3fcebf14b))
* **core:** add exam session advancement and conclusion ([e6ecd04](https://github.com/gabecmelo/Studdup/commit/e6ecd043528a906c31931783e213f9aa258d63a1))
* **core:** add history event recording and queries ([74df84a](https://github.com/gabecmelo/Studdup/commit/74df84aff2cbc67fb823dbf4ad80f819b4d85953))
* **core:** add leitner box review scheduling ([86aecc1](https://github.com/gabecmelo/Studdup/commit/86aecc1cab8e33193b42e3a304e470d6f425da06))
* **core:** add leitner item repository operations ([dde768c](https://github.com/gabecmelo/Studdup/commit/dde768c5d0332c0a6ca08f1946a428f1c5fe754c))
* **core:** add per-card cycles to PomodoroRhythm ([38d061b](https://github.com/gabecmelo/Studdup/commit/38d061b104c8f0d00dedfd4e797e20856b7ba687))
* **core:** add sqlite repository with schema and WAL ([06264b2](https://github.com/gabecmelo/Studdup/commit/06264b2df857c969ef2ec67de315d7b650f9afff))
* **core:** expose leitner items through api and bridge ([8b531ac](https://github.com/gabecmelo/Studdup/commit/8b531ac03b8bd05da20c1ff7183591430be26807))
* **core:** expose the exam cursor session due date on SessionCursor ([7d0cf51](https://github.com/gabecmelo/Studdup/commit/7d0cf51bc1f7e855723fdad523ed3eb8222eb70e))
* **core:** join the card title into history reads ([4b86304](https://github.com/gabecmelo/Studdup/commit/4b86304e6b24aa26298780ec8a0325ac5fa9ac54))
* **core:** persist pomodoro_cycles via schema v3 migration ([25bbf6c](https://github.com/gabecmelo/Studdup/commit/25bbf6cd4aa6dd9014f58e5f7a76397412030084))
* **core:** port Date type onto the time crate ([86b9c57](https://github.com/gabecmelo/Studdup/commit/86b9c57779b36800dfeaaf377fb82f447f15b3a2))
* **core:** port spaced-repetition scheduler with stage re-anchoring ([78a5556](https://github.com/gabecmelo/Studdup/commit/78a55564d886ab2fa84ef1f7376ade310be2e885))
* **core:** Sessão N de M cursor on the Prova board ([236b3eb](https://github.com/gabecmelo/Studdup/commit/236b3ebacc46795aea02a8e51a30d754a616f640))
* **ui:** active recall session screen ([f0a429c](https://github.com/gabecmelo/Studdup/commit/f0a429ce9dae73ff11c9102250bd5e06154b0455))
* **ui:** add card detail and event log modals ([9488752](https://github.com/gabecmelo/Studdup/commit/948875236260555b0f5b657f902584728bdf9702))
* **ui:** add collapsible shell with promoted method switcher ([7f6b6c9](https://github.com/gabecmelo/Studdup/commit/7f6b6c95d0ca068226b36440fa0ceb7a477e472b))
* **ui:** add delete card confirmation ([36f846c](https://github.com/gabecmelo/Studdup/commit/36f846c47e2c42a2ec4d9f07d687d5d6c8ac56b6))
* **ui:** add design tokens and light/dark theming ([f754f46](https://github.com/gabecmelo/Studdup/commit/f754f46d4800632fd36e23d73038cc4504e81840))
* **ui:** add drag-and-drop reschedule and complete ([203f341](https://github.com/gabecmelo/Studdup/commit/203f3410df5188eb78a32e45bb90dba286d2248c))
* **ui:** add exam grouping and exams rail for prova method ([ac06f08](https://github.com/gabecmelo/Studdup/commit/ac06f08cde7c493f9bc79d49fe4dbcb5f0d68489))
* **ui:** add exam list, detail and management modals ([ae28d28](https://github.com/gabecmelo/Studdup/commit/ae28d284919c7e5b2a23cf537fe8796a1fe13baa))
* **ui:** add leitner item editor in card detail ([b504ad0](https://github.com/gabecmelo/Studdup/commit/b504ad00f151180173551293c87d54ae57b32b0c))
* **ui:** add leitner review session ([c51493b](https://github.com/gabecmelo/Studdup/commit/c51493bfb13dd5f9e76e5613ceb02f31118b47a1))
* **ui:** add new and edit card modals with validation ([612dca5](https://github.com/gabecmelo/Studdup/commit/612dca51fbf8d0d6efb71345dad3842c850251a4))
* **ui:** add overdue resolution modal ([82b414a](https://github.com/gabecmelo/Studdup/commit/82b414ad1e32b84bb4dd21a1928dd57f2fcd973b))
* **ui:** add per-method and unified history with revive ([f87d6a6](https://github.com/gabecmelo/Studdup/commit/f87d6a6439830bfca57e3af2da9404422c4fbee4))
* **ui:** add plain no-technique session ([4035f0a](https://github.com/gabecmelo/Studdup/commit/4035f0a01775b294c2406cff426ae35a1185ad0a))
* **ui:** add pomodoro study session ([46d9f71](https://github.com/gabecmelo/Studdup/commit/46d9f7132e525ddcc9f756a6e017276fc4d2cbb4))
* **ui:** add postpone modal with review timer ([6d6eaa8](https://github.com/gabecmelo/Studdup/commit/6d6eaa840bfd76f876bdbb3156bea3a37f40d0c9))
* **ui:** add shared component library ([159c7b7](https://github.com/gabecmelo/Studdup/commit/159c7b70b3e0ebe40b027f7002e7a7dd92127243))
* **ui:** add typed command client, query hooks and ui store ([197255d](https://github.com/gabecmelo/Studdup/commit/197255da49265f333cf90881e8d113183ec878d5))
* **ui:** build the Início, Técnicas and Ajuda screens from the handoff ([acdeaec](https://github.com/gabecmelo/Studdup/commit/acdeaecccda435b1bf595acb337d3269684ff3ee))
* **ui:** dispatch board sessions by technique ([903f4c3](https://github.com/gabecmelo/Studdup/commit/903f4c318577cb70492578da546a169cf0602e97))
* **ui:** feynman session screen ([6306228](https://github.com/gabecmelo/Studdup/commit/630622848d5a9447dabbdb5c03e7a164076c55d8))
* **ui:** honor a cross-screen study intent on the board ([fb50374](https://github.com/gabecmelo/Studdup/commit/fb50374e3e9488adf3ccb7199e69bd727d6584f6))
* **ui:** hover states on modal actions ([19ed0db](https://github.com/gabecmelo/Studdup/commit/19ed0db093b643ab1c1b3e1895267d7ec752c66a))
* **ui:** hover states on sessions and the overdue modal ([b7adcac](https://github.com/gabecmelo/Studdup/commit/b7adcac0a6b663203cb5141d5b8563267cb6c4d9))
* **ui:** hover states on the Adiar modal ([5b4b60a](https://github.com/gabecmelo/Studdup/commit/5b4b60a446e8e4623a046642c3524fb2bc46d88c))
* **ui:** land on Início by default ([5719261](https://github.com/gabecmelo/Studdup/commit/571926153f4e3f8ec0a43566f88ec8f09b2b714e))
* **ui:** make Prova cards open the detail + study flow ([460a7e3](https://github.com/gabecmelo/Studdup/commit/460a7e3d69532f8fbf0c9e2abc23b6403f444ea3))
* **ui:** port Histórico to the handoff (colour-coded events, hover, dates) ([0e25d4e](https://github.com/gabecmelo/Studdup/commit/0e25d4eefed90f18a9ce5d308acd8e9376040052))
* **ui:** port ListaProvas and DetalheProva to the handoff ([b1cfe6e](https://github.com/gabecmelo/Studdup/commit/b1cfe6edfd99703d5e4dde4b9d40b5faabf8afcd))
* **ui:** port the Prova board to the handoff (colour-coded, ported columns) ([93d0bae](https://github.com/gabecmelo/Studdup/commit/93d0bae89f177d3d709a81a352b3c002dd1b0216))
* **ui:** previous attempts in card detail ([99bc936](https://github.com/gabecmelo/Studdup/commit/99bc936ab531511d715985e36349f7706ed0f1d3))
* **ui:** real nav icons, Pilha logo + Studd·up wordmark, sidebar hover ([a71ec27](https://github.com/gabecmelo/Studdup/commit/a71ec27b9eea4caf76d182fba3a4cb43481abcef))
* **ui:** render kanban board with due-date column placement ([521de17](https://github.com/gabecmelo/Studdup/commit/521de17605003e45fa160129c6431fbe9747a050))
* **ui:** run per-card Pomodoro cycles ([136c24d](https://github.com/gabecmelo/Studdup/commit/136c24d9a700fb599f4434ec46ca80f1e7a58b55))
* **ui:** session reminder banner with suppress flag ([9bb2011](https://github.com/gabecmelo/Studdup/commit/9bb201119526c92a860b420c1d9f695fcdbab222))
* **ui:** shared self-rating control and scale ([822b89d](https://github.com/gabecmelo/Studdup/commit/822b89ddb5889bced4df32530aa3d107c59fb761))
* **ui:** wire Início "estudar agora" and exam rows ([ec2f318](https://github.com/gabecmelo/Studdup/commit/ec2f318095d59d225f4a93850b88d4b82202ea37))
* **ui:** wire the board search and technique filter ([943703d](https://github.com/gabecmelo/Studdup/commit/943703d7be104084efa16e2874eb84fe4dc1d265))


### Bug Fixes

* **app:** load embedded ui in cargo run by dropping devUrl ([06aaa3b](https://github.com/gabecmelo/Studdup/commit/06aaa3bcc6d066d6d8720a58ed3081636a527133))
* **app:** serve the real react ui from ui/dist and wire tauri dev/build ([c61d2f4](https://github.com/gabecmelo/Studdup/commit/c61d2f489262565ca456234b6e2425fe8b012e32))
* **ci:** resolve the release id from the tag so tauri-action can upload ([5b3d178](https://github.com/gabecmelo/Studdup/commit/5b3d178753b9723b9dd0f3c3eb4ad578d6bb68a2))
* **core:** let exam cards advance multiple sessions in one day ([043fb2a](https://github.com/gabecmelo/Studdup/commit/043fb2a96eaf82dcd3ee2a7072836c0c5ebbe364))
* **core:** use Option::map in unix db-path resolution (clippy manual_map) ([cf8a686](https://github.com/gabecmelo/Studdup/commit/cf8a686ef02e90cd9094e1665da0f073de60b058))
* **core:** wire exam auto-conclusion for lapsed exams ([ea33b43](https://github.com/gabecmelo/Studdup/commit/ea33b4306f0cd9d78ad85286addb176c8770fb54))
* **ui:** bundle Outfit and DM Mono fonts and align tokens exactly to the handoff ([0f4f7bd](https://github.com/gabecmelo/Studdup/commit/0f4f7bda11350cbe7ef093496462cc0b9b717c2e))
* **ui:** center standalone screens and align config width to the handoff ([9095503](https://github.com/gabecmelo/Studdup/commit/9095503a5d2aa0df2cc0c826fd698560bdd1b348))
* **ui:** close modals and sessions on Escape ([0343614](https://github.com/gabecmelo/Studdup/commit/0343614847e7fcb3473f4fcd11be61119720765d))
* **ui:** create cards again by seeding valid dates in Novo Card ([13063c6](https://github.com/gabecmelo/Studdup/commit/13063c601039795ad179f793070760e3a03a6c56))
* **ui:** exam-correct card detail and postpone-from-today ([d364555](https://github.com/gabecmelo/Studdup/commit/d364555c7aa6c0975291fe506313f6d31cf48599))
* **ui:** keep active Prova cards pending, not Concluidos, while cursors load ([6db5d29](https://github.com/gabecmelo/Studdup/commit/6db5d29d7949581b3836295f45a0cb31c1a7cabf))
* **ui:** keep the sidebar theme pills in sync with Configurações ([c7a5fe2](https://github.com/gabecmelo/Studdup/commit/c7a5fe2bb192ebb9b6c1e6d170f6245789d8966b))
* **ui:** pad the Prova board and balance its header ([23b24af](https://github.com/gabecmelo/Studdup/commit/23b24af937df783dd22d9279b9e8e5d8613dddb4))
* **ui:** place exam cards by their session cursor due date ([159b545](https://github.com/gabecmelo/Studdup/commit/159b5456fe404cd5520fdd7ad2270c34403b0944))
* **ui:** port stage badge, empty state and modal shell to the handoff ([d2224b5](https://github.com/gabecmelo/Studdup/commit/d2224b51f455a55a87de18abc828080a670f1843))
* **ui:** rebuild board card, columns and context line to match the handoff ([3f9676d](https://github.com/gabecmelo/Studdup/commit/3f9676d92c0415cf5092856b1c2480281b32cac9))
* **ui:** rebuild shell and method switcher to match the handoff exactly ([4679671](https://github.com/gabecmelo/Studdup/commit/4679671a1d2d6b8e63794a51ee63ea89c917d70f))
* **ui:** scroll board columns internally, pad non-board screens, add working sidebar toggle ([2a81263](https://github.com/gabecmelo/Studdup/commit/2a81263c152937daeb5b5c2be4017783b6a470de))
* **ui:** wire the "Novo Card" button to the create-card modal ([dfd5fac](https://github.com/gabecmelo/Studdup/commit/dfd5fac3a0c5aea29403214b67fe79458b906df2))

## [0.2.0](https://github.com/gabecmelo/Studdup/compare/studdup-v0.1.0...studdup-v0.2.0) (2026-04-30)


### Features

#### Main Changes
* rename project to **studdup** and add version tracking ([fac0550](https://github.com/gabecmelo/Studdup/commit/fac055018e61f434d82a9028cf3f9e295a34477b))
* add **app shell and agenda view** with today/tomorrow/upcoming ([ce79b48](https://github.com/gabecmelo/Studdup/commit/ce79b48791cdd201c0b786b585e802a267f210ad))
* add **_card detail view_** (read all fields, access actions from one place) ([7f5ebdd](https://github.com/gabecmelo/Studdup/commit/7f5ebddbc42918359c7a1bc3746fcca395c8e8a9))
* add **_card edit modal_** (update title, content and review link) ([52b6cef](https://github.com/gabecmelo/Studdup/commit/52b6cefc3cfd66d2fcea7e814d4258a8d85ed09c))
* add card editor with day 0/1 creation and overdue resolution modal ([112f477](https://github.com/gabecmelo/Studdup/commit/112f4777cd126925c606f60ccc551a624b5c45fd))
* add **_delete card with confirmation dialog_** ([4830688](https://github.com/gabecmelo/Studdup/commit/48306889be9819343f27e952249fec4735132d21))
* add postpone study and review with **_5-min timer warning_** (THIS IS REALLY COOL) ([010ff9a](https://github.com/gabecmelo/Studdup/commit/010ff9abdc8dc655b9d2fb222a227ac50d963e8d))
* persist cards and event history via **sqlite** ([7696f7a](https://github.com/gabecmelo/Studdup/commit/7696f7a5713c85f8bd7e0e8e0b93a89135f467ce))
* **_dev mode_** (triple-click Today) with full stage picker on card creation ([3459700](https://github.com/gabecmelo/Studdup/commit/34597009b158e375d3eccfe604899fb367ec0c51))

#### Minor Changes
* add history view with event log and revive action ([5c63de2](https://github.com/gabecmelo/Studdup/commit/5c63de2a0effb895dc8ee786efcb02ca1d4fb0a4))
* add help modal listing hotkeys ([08593dc](https://github.com/gabecmelo/Studdup/commit/08593dc8e1e36b1b2effbbd6a871f30cb6ccce40))
* add card struct and stage enum with day0-30 ladder ([50df156](https://github.com/gabecmelo/Studdup/commit/50df156da2e4def9d7ce92118126aec24822afa1))
* add date type with local-tz today() and iso conversion ([369bf47](https://github.com/gabecmelo/Studdup/commit/369bf4781ddb71056a85dd9ccf74da7bd7110198))
* add glfw + opengl3 entry point with hotkey dispatch ([021b6d3](https://github.com/gabecmelo/Studdup/commit/021b6d366075066347928ec779ea535f85c1ebec))
* clickable links, To Study/Review label, Exit dev mode button ([d076c56](https://github.com/gabecmelo/Studdup/commit/d076c56cd770fc42d2b46b3f50a865082779470f))
* implement scheduler stage transitions anchored to startdate ([936a0f1](https://github.com/gabecmelo/Studdup/commit/936a0f1e2a03a5e0f9a8c05b1956b50401c25ee7))

### Bug Fixes

#### Main Fixes
* **store database in platform user-data dir** to survive builds and updates ([d12f2fa](https://github.com/gabecmelo/Studdup/commit/d12f2fa6b98253325b2f89fd6c52f579ebd0a5b2))
* postpone timer No-button, deleteCard error check, run.py UTF-8 output ([07906d8](https://github.com/gabecmelo/Studdup/commit/07906d8938841ecad293e5bfbb03af929a299a07))
* gate app dependencies behind BUILD_APP option to unblock test-only CI ([90d7ddc](https://github.com/gabecmelo/Studdup/commit/90d7ddc962b017425a7f0e574aec7c1240a339f7))

#### Minor Fixes
* correct lcov exclude patterns and suppress unused-pattern error ([4076908](https://github.com/gabecmelo/Studdup/commit/40769082e8323228c6ff3cc9607427cd248c0b79))
* define onWindowFocusChanged and silence MSVC strncpy warnings ([9d2f2a7](https://github.com/gabecmelo/Studdup/commit/9d2f2a7a93039c4a400f251a3336527d0578d15c))
* point release-please to config paths and disable Wayland on CI ([6f6a93f](https://github.com/gabecmelo/Studdup/commit/6f6a93fb47cc4017efea5e2cd412f7088308e518))

---
Reviewed and updated by @gabecmelo.
