//! Studdup core — pure, Tauri-free domain logic, scheduling, persistence and migration.
//!
//! Layered after the C++ reference (`Date`/`Card`/`Scheduler`/`DatabaseManager`), all UI-free,
//! so the coverage gate links the core alone (as the C++ CI did with `BUILD_APP=OFF`).

// Module stubs — filled in by later phases. Kept as empty inline modules so the crate
// compiles from the first task; each is promoted to a real module when its phase lands.
pub mod domain;
pub mod scheduler;
pub mod repository {}
pub mod api {}
