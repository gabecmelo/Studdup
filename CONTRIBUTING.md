# Contributing to Studdup

Thanks for your interest! Studdup is a small, offline desktop app and contributions of all sizes are
welcome — bug reports, docs, and code.

## Ways to help

- **Report a bug or request a feature** — [open an issue](https://github.com/gabecmelo/Studdup/issues/new/choose)
  using the templates. For bugs, include your OS and the app version.
- **Improve the docs** — README, SETUP, ARCHITECTURE, or in-code comments.
- **Send a pull request** — for anything non-trivial, please open an issue first so we can agree on
  the approach before you invest time.

## Development setup

See **[SETUP.md](SETUP.md)** to build, run and test the project, and **[ARCHITECTURE.md](ARCHITECTURE.md)**
for the layer map and the invariants (especially the stage-as-offset rule).

## Making a change

1. Fork and branch off `main` (e.g. `feat/short-description` or `fix/short-description`).
2. Keep changes focused. Match the style of the surrounding code.
3. Make sure the gate passes locally before pushing:

   ```sh
   cargo fmt --all --check
   cargo clippy -p studdup-core --all-targets -- -D warnings
   cargo test
   npm --prefix ui run build
   npm --prefix ui run test
   ```

4. Add or update tests for behaviour you change. Core logic (`studdup-core`) is coverage-gated at
   ≥70% lines.

## Commit & PR conventions

- Use **[Conventional Commits](https://www.conventionalcommits.org/)** — `feat:`, `fix:`, `docs:`,
  `refactor:`, `chore:`, `test:`, `ci:`. Releases and the changelog are generated from these.
- Prefer **atomic commits** — one logical change each.
- PRs are merged with a **merge commit** (not squash) so the individual conventional commits reach
  `main`; a squash would collapse them into one non-conventional subject and the release automation
  would see nothing to release. If you must squash, make the **PR title** a valid conventional
  commit.
- Keep PRs small and describe the change and its motivation. Link the issue it addresses.

## Reporting security issues

Please do not open a public issue for a security vulnerability. Instead, report it privately to the
maintainer (see the profile at [@gabecmelo](https://github.com/gabecmelo)).

## Code of conduct

Be respectful and constructive. Assume good faith. Harassment of any kind is not tolerated.
