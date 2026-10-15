"""Validate channel isolation and reproducible archive contents."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_xpi", ROOT / "scripts/build-xpi.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class PackagingTests(unittest.TestCase):
    def test_channels_preserve_sources_and_keep_updates_separate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "extension").mkdir()
            (root / "publication").mkdir()
            original = {"version": "1.0", "browser_specific_settings": {"gecko": {"id": "mail@test", "update_url": "https://example.org/updates.json"}}}
            source = root / "extension/manifest.json"
            source.write_text(json.dumps(original), encoding="utf-8")
            original_bytes = source.read_bytes()
            (root / "extension/main.js").write_text("const readable = true;", encoding="utf-8")
            (root / "publication/atn.json").write_text('{"version":"1.1"}', encoding="utf-8")
            (root / "secret.dpapi").write_text("never package")
            atn = builder.build(root, "atn")
            first = atn.read_bytes()
            self.assertEqual(builder.build(root, "atn").read_bytes(), first)
            with ZipFile(atn) as z:
                manifest = json.loads(z.read("manifest.json"))
                self.assertEqual(manifest["version"], "1.1")
                self.assertNotIn("update_url", manifest["browser_specific_settings"]["gecko"])
                self.assertEqual(manifest["browser_specific_settings"]["gecko"]["id"], "mail@test")
                self.assertEqual(set(z.namelist()), {"manifest.json", "main.js"})
            with ZipFile(builder.build(root)) as z:
                self.assertEqual(json.loads(z.read("manifest.json")), original)
            self.assertEqual(source.read_bytes(), original_bytes)

if __name__ == "__main__":
    unittest.main()
