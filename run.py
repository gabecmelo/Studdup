#!/usr/bin/env python3
"""
studdup — project task runner
Works identically on Windows and Linux (Python 3.8+, no extra packages).

Usage:
  python run.py lint              Check code style (clang-format)
  python run.py fix               Auto-fix code style in-place
  python run.py test              Build & run unit tests
  python run.py build             Build Debug  (default)
  python run.py build debug       Build Debug
  python run.py build release     Build Release
  python run.py clean             Remove all build directories
"""

import glob
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

# ── Colour output ─────────────────────────────────────────────────────────────

def _enable_win_ansi() -> bool:
    if platform.system() != "Windows":
        return True
    try:
        import ctypes
        handle = ctypes.windll.kernel32.GetStdHandle(-11)   # STD_OUTPUT_HANDLE
        mode   = ctypes.c_ulong()
        ctypes.windll.kernel32.GetConsoleMode(handle, ctypes.byref(mode))
        # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
        ctypes.windll.kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        return True
    except Exception:
        return False

_USE_COLOR = _enable_win_ansi() and hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

def _c(text, code):
    return "\033[{}m{}\033[0m".format(code, text) if _USE_COLOR else text

def _head(msg): print(_c("\n" + msg, "1;37"))       # bold white
def _step(msg): print(_c("  → " + msg, "36"))       # cyan
def _good(msg): print(_c("  ✓ " + msg, "32"))       # green
def _warn(msg): print(_c("  ! " + msg, "33"))       # yellow
def _fail(msg): print(_c("  ✗ " + msg, "31"), file=sys.stderr)  # red

# ── subprocess wrapper ────────────────────────────────────────────────────────

def _run(cmd):
    _step(" ".join(str(x) for x in cmd))
    r = subprocess.run([str(x) for x in cmd], cwd=ROOT)
    if r.returncode != 0:
        _fail("Command exited with code {}".format(r.returncode))
        sys.exit(r.returncode)

# ── Platform helpers ──────────────────────────────────────────────────────────

IS_WIN = platform.system() == "Windows"


def _cmake_generator():
    """
    On Windows, force Visual Studio 17 2022 so cmake never falls back to
    NMake Makefiles (which requires running inside a VS Developer Command Prompt).
    On Linux the default generator (Unix Makefiles) works out of the box.
    """
    return ["-G", "Visual Studio 17 2022", "-A", "x64"] if IS_WIN else []


def _cmake_build_type(build_type):
    """CMAKE_BUILD_TYPE is only honoured by single-config generators (Linux)."""
    return [] if IS_WIN else ["-DCMAKE_BUILD_TYPE={}".format(build_type)]


def _cmake_config(build_type):
    """--config selects the config in multi-config generators (Windows/MSVC)."""
    return ["--config", build_type] if IS_WIN else []


def _ctest_config(build_type):
    """-C selects the config when running ctest against a VS build."""
    return ["-C", build_type] if IS_WIN else []

# ── Source file discovery ─────────────────────────────────────────────────────

def _sources():
    files = []
    for pat in ("src/**/*.cpp", "src/**/*.h", "tests/**/*.cpp", "tests/**/*.h"):
        files.extend(ROOT.glob(pat))
    return sorted(str(f) for f in files)

# ── clang-format detection ────────────────────────────────────────────────────

def _find_clang_format():
    for name in ("clang-format",
                 "clang-format-18", "clang-format-17",
                 "clang-format-16", "clang-format-15"):
        path = shutil.which(name)
        if path:
            return path
    return None

# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_lint():
    _head("Lint")
    cf = _find_clang_format()
    if not cf:
        _fail("clang-format not found — install it and add it to PATH.")
        _warn("  Windows: winget install LLVM.LLVM")
        _warn("  Linux  : sudo apt install clang-format")
        sys.exit(1)

    files = _sources()
    if not files:
        _warn("No source files found.")
        return

    _step("Checking {} file(s) with {} ...".format(len(files), cf))
    r = subprocess.run([cf, "--dry-run", "--Werror", "--style=file"] + files,
                       cwd=ROOT)
    if r.returncode != 0:
        _fail("Formatting issues detected.")
        _warn("Run  python run.py fix  to apply automatic corrections.")
        sys.exit(r.returncode)
    _good("All {} file(s) correctly formatted.".format(len(files)))


def cmd_fix():
    _head("Fix")
    cf = _find_clang_format()
    if not cf:
        _fail("clang-format not found.")
        sys.exit(1)

    files = _sources()
    _step("Formatting {} file(s) in-place ...".format(len(files)))
    _run([cf, "-i", "--style=file"] + files)
    _good("Done.")


def cmd_test():
    _head("Test")
    build_dir  = ROOT / "build-test"
    build_type = "Debug"

    _step("Configuring (Debug + tests) ...")
    _run(["cmake", "-B", build_dir]
         + _cmake_generator()
         + _cmake_build_type(build_type)
         + ["-DBUILD_TESTS=ON", "-DENABLE_COVERAGE=OFF"])

    _step("Building studdup_tests ...")
    _run(["cmake", "--build", build_dir,
          "--target", "studdup_tests", "--parallel"]
         + _cmake_config(build_type))

    _step("Running ctest ...")
    _run(["ctest", "--test-dir", build_dir, "--output-on-failure"]
         + _ctest_config(build_type))

    _good("All tests passed.")


def cmd_build(build_type="Debug"):
    build_type = build_type.capitalize()
    if build_type not in ("Debug", "Release"):
        _fail("Unknown build type '{}'. Use 'debug' or 'release'.".format(build_type))
        sys.exit(1)

    _head("Build  ({})".format(build_type))
    build_dir = ROOT / "build-{}".format(build_type.lower())

    _step("Configuring ...")
    _run(["cmake", "-B", build_dir]
         + _cmake_generator()
         + _cmake_build_type(build_type))

    _step("Compiling ...")
    _run(["cmake", "--build", build_dir, "--parallel"]
         + _cmake_config(build_type))

    # Locate the produced binary and print its path
    binary = (build_dir / build_type / "studdup.exe") if IS_WIN \
             else (build_dir / "studdup")
    if binary.exists():
        _good("Binary: {}".format(binary))
    else:
        _good("Build complete — output in: {}".format(build_dir))


def cmd_clean():
    _head("Clean")
    removed = 0
    for name in ("build", "build-debug", "build-release", "build-test"):
        path = ROOT / name
        if path.is_dir():
            _step("Removing {} ...".format(path))
            shutil.rmtree(path)
            removed += 1
    _good("Removed {} build director{}.".format(
        removed, "y" if removed == 1 else "ies") if removed else "Nothing to clean.")

# ── Entry point ───────────────────────────────────────────────────────────────

_USAGE = """\
studdup task runner  —  python run.py <command> [args]

  lint              Check code style (clang-format --dry-run)
  fix               Auto-fix code style in-place
  test              Build & run unit tests
  build             Build Debug  (default)
  build debug       Build Debug
  build release     Build Release
  clean             Remove all build directories
"""


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(_USAGE)
        return

    cmd = args[0].lower()

    if   cmd == "lint":  cmd_lint()
    elif cmd == "fix":   cmd_fix()
    elif cmd == "test":  cmd_test()
    elif cmd == "build": cmd_build(args[1] if len(args) > 1 else "Debug")
    elif cmd == "clean": cmd_clean()
    else:
        _fail("Unknown command: '{}'".format(cmd))
        print(_USAGE, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
