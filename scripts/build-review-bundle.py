"""Package explicit review inputs; never include credentials or build outputs."""
import json
import hashlib
import shutil
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "publication/atn.json").read_text(encoding="utf-8"))["version"]
output = root / "dist/atn"
output.mkdir(parents=True, exist_ok=True)
inputs = [root / name for name in ["README.md", "LICENSE", "package.json", "package-lock.json", "installer/macos/update-public-key.txt", "scripts/build-xpi.py", "scripts/build-review-bundle.py"]]
inputs.extend(root.glob("README.*.md"))
allowed = {".js", ".mjs", ".cjs", ".json", ".html", ".css", ".svg", ".png", ".ico", ".bmp", ".py", ".ps1", ".cmd", ".cpp", ".wxs", ".rtf", ".md", ".swift", ".sh", ".plist"}
for folder in ["extension", "helper", "installer", "publication"]:
    for item in sorted((root / folder).rglob("*")):
        if item.is_file() and (item.suffix in allowed or item.name == "LICENSE") and not item.name.startswith("test-") and item.name != "generated.wxs" and "__pycache__" not in item.parts:
            inputs.append(item)
target = output / f"Mail-AI-Assist-{version}-Review-Source.zip"
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for item in sorted(set(inputs)):
        archive.write(item, item.relative_to(root).as_posix())
for name in ["PRIVACY.md", "REVIEW-NOTES.md", "LISTING.md"]:
    shutil.copy2(root / "publication" / name, output / name)
for listing in sorted((root / "publication").glob("LISTING.*.md")):
    shutil.copy2(listing, output / listing.name)
packages = [output / f"Mail-AI-Assist-{version}-ATN.xpi", target]
(output / "SHA256SUMS.txt").write_text("".join(hashlib.sha256(item.read_bytes()).hexdigest() + "  " + item.name + "\n" for item in packages), encoding="utf-8")
print(target)
