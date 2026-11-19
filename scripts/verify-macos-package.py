"""Verify an unsigned macOS installer against its source and execute native tests."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


def run(command, **kwargs):
    """Fail the verification immediately when a native command fails."""
    return subprocess.check_output(command, text=True, **kwargs).strip()


def compare_xpi(package_xpi):
    """Compare readable add-on files, allowing manifest serialization differences."""
    sources = {file.relative_to(ROOT / 'extension').as_posix(): file for file in (ROOT / 'extension').rglob('*') if file.is_file()}
    with ZipFile(package_xpi) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != set(sources):
            raise RuntimeError('Unexpected XPI content')
        for name, source in sources.items():
            expected = source.read_bytes()
            actual = archive.read(name)
            if name == 'manifest.json':
                if json.loads(actual) != json.loads(expected):
                    raise RuntimeError('XPI manifest mismatch')
            elif actual != expected:
                raise RuntimeError('XPI source mismatch: ' + name)
    return len(sources)


def verify_payload(expanded, config, arch, runtime):
    """Validate installation paths, identities, payload bytes and native architecture."""
    info = ET.parse(expanded / 'PackageInfo').getroot()
    if info.get('version') != config['version'] or info.get('identifier') != 'cn.live.it.mail-ai-assist.helper':
        raise RuntimeError('Package identity mismatch')
    app = expanded / 'Payload/Library/Application Support/MailAiAssist'
    helper_sources = sorted((ROOT / 'helper').glob('*.mjs')) + [ROOT / 'helper/launch.sh']
    for source in helper_sources:
        if source.read_bytes() != (app / 'helper' / source.name).read_bytes():
            raise RuntimeError('Helper source mismatch: ' + source.name)
    expected_helpers = {file.name for file in helper_sources}
    if {file.name for file in (app / 'helper').iterdir()} != expected_helpers:
        raise RuntimeError('Unexpected helper payload')
    if (runtime / 'bin/node').read_bytes() != (app / 'runtime/node').read_bytes():
        raise RuntimeError('Node runtime mismatch')
    installation = json.loads((app / 'mac-install.json').read_text())
    if installation['version'] != config['version'] or installation['platform'] != f'macos-{arch}':
        raise RuntimeError('Mac installation configuration mismatch')
    if installation['publicKey'] != (ROOT / 'installer/macos/update-public-key.txt').read_text():
        raise RuntimeError('Update public key mismatch')
    manifest_path = expanded / 'Payload/Library/Application Support/Mozilla/NativeMessagingHosts/local.mail_ai_assist.json'
    native_manifest = json.loads(manifest_path.read_text())
    if native_manifest['path'] != '/Library/Application Support/MailAiAssist/helper/launch.sh' or native_manifest['allowed_extensions'] != [config['addonId']]:
        raise RuntimeError('Native messaging registration mismatch')
    machine = 'arm64' if arch == 'arm64' else 'x86_64'
    for binary in [app / 'runtime/node', app / 'native/mail-ai-assist-macos']:
        if run(['lipo', '-archs', str(binary)]).split() != [machine]:
            raise RuntimeError('Executable architecture mismatch')
        if not binary.stat().st_mode & stat.S_IXUSR:
            raise RuntimeError('Missing executable permission')
    if not (app / 'helper/launch.sh').stat().st_mode & stat.S_IXUSR:
        raise RuntimeError('Launcher is not executable')
    for name in ['preinstall', 'postinstall']:
        script = expanded / 'Scripts' / name
        run(['sh', '-n', str(script)])
        if not script.stat().st_mode & stat.S_IXUSR:
            raise RuntimeError('Installer script is not executable')
    package_info = json.loads(run([str(app / 'runtime/node'), '-p', 'JSON.stringify({platform:process.platform,arch:process.arch,version:process.version})']))
    if package_info['platform'] != 'darwin' or package_info['arch'] != arch:
        raise RuntimeError('Bundled runtime cannot execute natively')
    xpi_count = compare_xpi(app / 'Mail-AI-Assist.xpi')
    return app, package_info, xpi_count


def run_native_tests(app):
    """Test the packaged bridge using isolated storage and no real account requests."""
    native = ROOT / 'native'
    native.mkdir(exist_ok=True)
    bridge = native / 'mail-ai-assist-macos'
    if bridge.exists():
        raise RuntimeError('Refusing to overwrite an existing test bridge')
    shutil.copy2(app / 'native/mail-ai-assist-macos', bridge)
    tests = ['macos-support', 'process-lock', 'export-lock', 'desktop-export', 'desktop-cleanup', 'export-directory', 'export-retention', 'raw-eml', 'provider-routing', 'ollama']
    result = subprocess.run([str(app / 'runtime/node'), '--test', '--test-reporter=tap', *[f'tests/{name}.test.mjs' for name in tests]], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=180)
    report = ROOT / 'work/macos-native-tests.tap'
    report.write_text(result.stdout, encoding='utf-8')
    print(result.stdout, flush=True)
    if result.returncode:
        raise RuntimeError('Native macOS regression tests failed')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arch', required=True, choices=['arm64', 'x64'])
    parser.add_argument('--runtime', required=True, type=Path)
    args = parser.parse_args()
    config = json.loads((ROOT / 'installer/release-config.json').read_text())
    output = ROOT / 'dist/macos' / config['version']
    package = output / f'Mail-AI-Assist-{config["version"]}-macos-{args.arch}-unsigned.pkg'
    with tempfile.TemporaryDirectory(prefix='verify-macos-', dir=ROOT / 'work') as temporary:
        expanded = Path(temporary) / 'expanded'
        run(['pkgutil', '--expand-full', str(package), str(expanded)])
        app, runtime, xpi_count = verify_payload(expanded, config, args.arch, args.runtime.resolve())
        report = run_native_tests(app)
    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    (output / f'SHA256SUMS-macos-{args.arch}.txt').write_text(f'{digest}  {package.name}\n', encoding='utf-8')
    summary = {'version': config['version'], 'arch': args.arch, 'runtime': runtime, 'source_commit': run(['git', 'rev-parse', 'HEAD'], cwd=ROOT), 'xpi_files': xpi_count, 'sha256': digest, 'size': package.stat().st_size, 'apple_signed': False, 'notarized': False, 'native_tests': report.read_text().splitlines()[-8:]}
    (output / f'VALIDATION-macos-{args.arch}.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    shutil.copy2(report, output / f'TESTS-macos-{args.arch}.tap')
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == '__main__':
    main()
