// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Studdup desktop binary entry — a thin shim over the shared [`studdup_lib::run`].
//!
//! All app wiring (plugins, command registry, database open + migration) lives in the library so
//! the same `run()` serves both this desktop binary and the generated Android entry point.

fn main() {
    studdup_lib::run();
}
