"""Discover local build tools without machine-specific paths."""
import os
from pathlib import Path
import shutil
import subprocess


def runtime_directory(root):
    return Path(os.environ.get("MAIL_AI_RUNTIME_DIR", str(root / "runtime"))).resolve()


def find_wix():
    candidate = os.environ.get("WIX_EXE") or shutil.which("wix")
    if not candidate:
        candidate = Path(__file__).resolve().parent.parent / "work/wix-tools/wix.exe"
    if not Path(candidate).is_file():
        raise SystemExit("WiX not found. Set WIX_EXE or install WiX in work/wix-tools.")
    return str(Path(candidate).resolve())


def compiler_environment():
    explicit = os.environ.get("VCVARS64")
    if explicit:
        candidate = Path(explicit)
    elif shutil.which("cl"):
        return None
    else:
        vswhere = shutil.which("vswhere") or str(Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Microsoft Visual Studio/Installer/vswhere.exe")
        if not Path(vswhere).is_file():
            raise SystemExit("MSVC not found. Run in an x64 developer shell or set VCVARS64.")
        installation = subprocess.check_output([vswhere, "-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"], text=True).strip()
        candidate = Path(installation) / "VC/Auxiliary/Build/vcvars64.bat"
    if not candidate.is_file() or any(c in str(candidate) for c in ['"', "\n", "\r"]):
        raise SystemExit("Invalid VCVARS64 path.")
    return str(candidate.resolve())
