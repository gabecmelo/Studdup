//! All due-date computation and stage/session transitions, dispatched by `Method` (C1 hybrid).
//!
//! - `spaced` — the fixed ladder path, a 1:1 port of the C++ `Scheduler` (AD-003).
//! - `exam` — the materialized exam-prep path (AD-005): back-loaded distribution and
//!   cursor-based session advancement.
//!
//! Every function is pure: it takes values, returns updated values — the same discipline
//! the C++ reference used, which keeps desynchronized state unrepresentable.

pub mod exam;
pub mod spaced;
