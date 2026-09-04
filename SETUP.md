# Developer setup

How to build, run and test Studdup from source. If you just want to *use* the app, download a
prebuilt installer from the [Releases page](https://github.com/gabecmelo/Studdup/releases/latest) —
see the [README](README.md).

## Repository layout

```
studdup-core/   Pure Rust: domain types, scheduler, SQLite repository, migration, the api facade.
                No Tauri, no UI — the tested, coverage-gated heart of the app.
studdup/        The Tauri desktop app: resolves the DB path, migrates it, exposes core::api as
                #[tauri::command]s, and holds the tauri.conf.json + icons.
ui/             React + Vite + TypeScript frontend (kanban board, session screens, modals).
```

The Rust side is a Cargo workspace (`studdup-core` + `studdup`); the frontend is a separate npm
project in `ui/` that the Tauri app embeds from `ui/dist` at build time.

## Prerequisites

- **Rust** stable (developed against 1.97+), via [rustup](https://rustup.rs) — provides `cargo`,
  `rustfmt` and `clippy`.
- **Node.js** 22+ and **npm** 10+.
- **cargo-llvm-cov** for the coverage gate: `cargo install cargo-llvm-cov`.
- The Tauri toolchain for your OS (WebView + C toolchain): see the
  [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). On Debian/Ubuntu that is
  roughly `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev
  libayatana-appindicator3-dev librsvg2-dev`.

## Build

Compile the Rust workspace (core + desktop app):

```sh
cargo build
```

Install the UI dependencies and build the frontend bundle (the app embeds `ui/dist`):

```sh
npm --prefix ui ci
npm --prefix ui run build
```

## Run

Frontend only, in Vite's dev server (hot-reloading UI at the printed `localhost` URL — note the
Tauri commands won't respond outside the desktop shell):

```sh
npm --prefix ui run dev
```

To produce distributable bundles (installers), use the Tauri CLI from the app crate — this is what
CI does on a release:

```sh
cargo install tauri-cli --version "^2"
npm --prefix ui run build        # ui/dist must exist first
cargo tauri build                # bundles land in target/release/bundle/
```

## Android build (from source)

Studdup ships an Android build from the same crate and UI as the desktop app. To build it locally you
need, on top of the prerequisites above:

- **Android Studio** (or the standalone command-line tools) with the **Android SDK** and **NDK**
  installed, and `ANDROID_HOME`/`NDK_HOME` set to point at them.
- **JDK 17** (Temurin or the one bundled with Android Studio).
- The Rust Android targets:

  ```sh
  rustup target add aarch64-linux-android armv7-linux-androideabi \
    i686-linux-android x86_64-linux-android
  ```

Then, from the app crate, generate the Android project once and build or run it:

```sh
npm --prefix ui run build            # ui/dist must exist first
cd studdup
cargo tauri android init             # one-time: generates studdup/gen/android
cargo tauri android dev              # run on a connected device / emulator (hot-reload)
cargo tauri android build --apk      # produce an APK under gen/android/app/build/outputs
```

`cargo tauri android dev` needs a running emulator or a device with USB debugging enabled. For
producing a **signed release** APK (the CI path) and the required GitHub secrets, see
[Android release signing](#android-release-signing-maintainer-one-time) below.

## Test

```sh
cargo test                       # Rust unit + integration tests
npm --prefix ui run test         # Vitest frontend suite
```

## Lint, format & coverage

```sh
cargo fmt --all --check
cargo clippy -p studdup-core --all-targets -- -D warnings
cargo llvm-cov -p studdup-core --fail-under-lines 70
```

Line coverage on `studdup-core` is well above the 70% gate.

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please). Merging
Conventional-Commit changes to `main` opens a release PR; merging that PR tags the release and the
workflow builds and attaches the per-OS bundles. Use **merge commits** (not squash) so the
individual `feat:`/`fix:` commits reach `main` — a squash collapses them into one non-conventional
subject and release-please sees nothing to release.

## Android APKs from CI

Three workflows build a signed APK, all sharing the same toolchain through the reusable
[`android-apk.yml`](.github/workflows/android-apk.yml) so a staging APK is built exactly like the
release one:

| Workflow | Trigger | Where the APK lands |
| --- | --- | --- |
| [`android-staging.yml`](.github/workflows/android-staging.yml) | Manual — Actions → *APK de staging* → **Run workflow**, pick the branch | Artifact on the run (14 days) |
| [`android-main.yml`](.github/workflows/android-main.yml) | Every merge into `main` | Rolling `main-latest` prerelease |
| [`release-please.yml`](.github/workflows/release-please.yml) | Merging the Release PR | The versioned `v*` release |

`android-main.yml` skips release-please's own `chore(main): release` commit, so a released version
is published once (as the version) rather than twice.

All three need the signing secrets below; without them the build fails early rather than producing
an unsigned APK, which Android refuses to install ("pacote inválido").

## Android release signing (maintainer, one-time)

The CI Android jobs build and sign the APK from a release keystore supplied through GitHub Actions
secrets. Wiring it up is a one-time maintainer task; the keystore and passwords never touch the
repo.

1. Generate the Android project so `gen/android/app/build.gradle.kts` exists to edit. Commit
   `gen/android` (its gradle build outputs and the keystore are gitignored) so CI builds
   reproducibly — AD-017:

   ```sh
   npm --prefix ui ci && npm --prefix ui run build
   cd studdup
   cargo tauri android init
   ```

2. Create a release keystore. Keep the generated `.jks` **out of git** — it is the signing secret:

   ```sh
   keytool -genkey -v -keystore studdup-release.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias studdup
   ```

3. Add the release signing config to `studdup/gen/android/app/build.gradle.kts`. Add the imports at
   the top of the file:

   ```kotlin
   import java.io.FileInputStream
   import java.util.Properties
   ```

   Add a `signingConfigs` block that reads `keystore.properties` (the CI job writes this file from
   the secrets), immediately before `buildTypes`:

   ```kotlin
   signingConfigs {
       create("release") {
           val props = Properties()
           val propsFile = rootProject.file("keystore.properties")
           if (propsFile.exists()) {
               props.load(FileInputStream(propsFile))
               storeFile = file(props["storeFile"] as String)
               storePassword = props["storePassword"] as String
               keyAlias = props["keyAlias"] as String
               keyPassword = props["keyPassword"] as String
           }
       }
   }
   ```

   And apply it to the `release` build type:

   ```kotlin
   buildTypes {
       getByName("release") {
           signingConfig = signingConfigs.getByName("release")
       }
   }
   ```

4. Base64-encode the keystore and register the four repository secrets the workflow reads
   (Settings → Secrets and variables → Actions):

   ```sh
   base64 -w0 studdup-release.jks   # paste the output into ANDROID_KEY_BASE64
   ```

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEY_BASE64` | base64 of the `.jks` keystore |
   | `ANDROID_KEY_ALIAS` | the `-alias` used above (`studdup`) |
   | `ANDROID_KEY_PASSWORD` | the key password |
   | `ANDROID_STORE_PASSWORD` | the keystore (store) password |

   On each tagged release the job decodes the keystore, writes `gen/android/keystore.properties`
   (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`), builds the APK with `tauri android
   build --apk`, and uploads the signed `*.apk` to the release.

## More

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the layer map, the stage-as-offset invariant, the database
  schema, and step-by-step guides for adding a new method or technique.
- [`AGENTS.md`](AGENTS.md) — conventions and invariants for any contributor (human or AI agent).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to propose and land a change.
- `.specs/` — the spec-driven record: requirements, decisions (AD-NNN) and lessons.
