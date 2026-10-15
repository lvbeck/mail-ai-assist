"""Build self-hosted or ATN XPI without changing the source manifest."""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED


def build(root, channel="self-hosted"):
    source = root / "extension"
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    if channel == "atn":
        config = json.loads((root / "publication/atn.json").read_text(encoding="utf-8"))
        manifest["version"] = config["version"]
        manifest["browser_specific_settings"]["gecko"].pop("update_url", None)
    version = manifest["version"]
    output = root / "dist" / "atn" if channel == "atn" else root / "dist"
    output.mkdir(parents=True, exist_ok=True)
    suffix = "-ATN" if channel == "atn" else ""
    target = output / f"Mail-AI-Assist-{version}{suffix}.xpi"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for item in sorted(source.rglob("*")):
            if not item.is_file():
                continue
            name = item.relative_to(source).as_posix()
            data = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8") if name == "manifest.json" else item.read_bytes()
            info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", choices=["self-hosted", "atn"], default="self-hosted")
    args = parser.parse_args()
    print(build(Path(__file__).resolve().parent.parent, args.channel))
