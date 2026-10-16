'''Build a platform-specific native host PKG on macOS; never upload or install it.'''
import argparse
import json
import os
import platform
import shutil
import subprocess
import tempfile
import sys
from zipfile import ZipFile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INSTALL = Path('/Library/Application Support/MailAiAssist')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--arch', required=True, choices=['arm64', 'x64'])
    parser.add_argument('--runtime', required=True, type=Path, help='Extracted official Node 22+ macOS archive (bin/node and LICENSE)')
    parser.add_argument('--public-key', required=True, type=Path, help='Publisher RSA update public key, never a private key')
    parser.add_argument('--app-sign-identity')
    parser.add_argument('--installer-sign-identity')
    parser.add_argument('--notary-profile', help='Existing notarytool Keychain profile; no credentials in command arguments')
    parser.add_argument('--unsigned', action='store_true', help='Local testing only; not suitable for public distribution')
    args = parser.parse_args()
    if platform.system() != 'Darwin':
        parser.error('PKG compilation, signing and verification require macOS.')
    if not args.unsigned and not all([args.app_sign_identity, args.installer_sign_identity, args.notary_profile]):
        parser.error('Public builds require both Developer ID identities and --notary-profile; use --unsigned only for local testing.')
    config = json.loads((ROOT / 'installer/release-config.json').read_text(encoding='utf-8'))
    version = config['version']
    public_key = args.public_key.read_text(encoding='utf-8')
    if '-----BEGIN PUBLIC KEY-----' not in public_key or 'PRIVATE' in public_key:
        parser.error('--public-key must be an RSA public key in SPKI PEM format.')
    node = args.runtime.resolve() / 'bin/node'
    license_file = args.runtime.resolve() / 'LICENSE'
    if not node.is_file() or not license_file.is_file():
        parser.error('The runtime must contain bin/node and LICENSE.')
    machine = 'arm64' if args.arch == 'arm64' else 'x86_64'
    architectures = subprocess.check_output(['lipo', '-archs', str(node)], text=True).split()
    if machine not in architectures:
        parser.error('Node runtime does not contain the selected architecture.')
    (ROOT / 'work').mkdir(exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f'macos-{args.arch}-', dir=ROOT / 'work'))
    payload = stage / 'payload'
    app = payload / INSTALL.relative_to('/')
    (app / 'runtime').mkdir(parents=True)
    (app / 'native').mkdir()
    (app / 'helper').mkdir()
    for source in (ROOT / 'helper').glob('*.mjs'):
        shutil.copy2(source, app / 'helper' / source.name)
    shutil.copy2(ROOT / 'helper/launch.sh', app / 'helper/launch.sh')
    shutil.copy2(node, app / 'runtime/node')
    shutil.copy2(license_file, app / 'runtime/NODE-LICENSE.txt')
    shutil.copy2(ROOT / 'LICENSE', app / 'LICENSE.txt')
    # Package the same readable XPI as the standalone add-on download.
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-pages.py')], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-xpi.py')], cwd=ROOT, check=True)
    xpi = ROOT / 'dist' / f'Mail-AI-Assist-{version}.xpi'
    with ZipFile(xpi) as archive:
        manifest = json.loads(archive.read('manifest.json'))
        if manifest['version'] != version or manifest['browser_specific_settings']['gecko']['id'] != config['addonId']:
            raise RuntimeError('Bundled XPI identity does not match the helper.')
    shutil.copy2(xpi, app / 'Mail-AI-Assist.xpi')
    shutil.copy2(ROOT / 'installer/macos/setup-guide.html', app / 'setup-guide.html')
    (app / 'helper/launch.sh').chmod(0o755)
    (app / 'runtime/node').chmod(0o755)
    (app / 'mac-install.json').write_text(json.dumps({**config, 'platform': f'macos-{args.arch}', 'publicKey': public_key}, indent=2) + '\n', encoding='utf-8')
    manifests = payload / 'Library/Application Support/Mozilla/NativeMessagingHosts'
    manifests.mkdir(parents=True)
    (manifests / 'local.mail_ai_assist.json').write_text(json.dumps({
        'name': 'local.mail_ai_assist', 'description': 'Mail AI Assist local connection',
        'path': str(INSTALL / 'helper/launch.sh'), 'type': 'stdio', 'allowed_extensions': [config['addonId']]
    }, indent=2) + '\n', encoding='utf-8')
    sdk = subprocess.check_output(['xcrun', '--sdk', 'macosx', '--show-sdk-path'], text=True).strip()
    native = app / 'native/mail-ai-assist-macos'
    subprocess.run(['xcrun', 'swiftc', '-O', '-sdk', sdk, '-target', f'{machine}-apple-macosx13.0',
                    str(ROOT / 'installer/macos/main.swift'), '-o', str(native)], check=True)
    native.chmod(0o755)
    scripts = stage / 'scripts'
    scripts.mkdir()
    preinstall = scripts / 'preinstall'
    preinstall.write_text('''#!/bin/sh
set -eu
# Reject non-boot target volumes and cross-architecture installation.
[ "${3:-/}" = / ] || exit 1
arm=$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)
''' + ('[ "$arm" = 1 ] || exit 1\n' if args.arch == 'arm64' else '[ "$arm" != 1 ] || exit 1\n') + '''
# Never follow a user-created symlink during a privileged installation.
for path in '/Library/Application Support/MailAiAssist' '/Library/Application Support/Mozilla' '/Library/Application Support/Mozilla/NativeMessagingHosts'; do
    [ ! -L "$path" ] || exit 1
done
if [ -d '/Library/Application Support/MailAiAssist' ]; then
    [ -z "$(/usr/bin/find '/Library/Application Support/MailAiAssist' -type l -print -quit)" ] || exit 1
fi
[ ! -L '/Library/Application Support/Mozilla/NativeMessagingHosts/local.mail_ai_assist.json' ] || exit 1
exit 0
''', encoding='utf-8')
    preinstall.chmod(0o755)
    postinstall = scripts / 'postinstall'
    postinstall.write_text("""#!/bin/sh
# Open the local guide as the desktop user, never as the privileged installer.
guide='/Library/Application Support/MailAiAssist/setup-guide.html'
console_user=$(/usr/bin/stat -f '%Su' /dev/console 2>/dev/null) || exit 0
case "$console_user" in ''|root|loginwindow|_mbsetupuser) exit 0 ;; esac
console_uid=$(/usr/bin/id -u "$console_user" 2>/dev/null) || exit 0
if [ "$console_uid" -ge 501 ] && [ -f "$guide" ]; then
    /bin/launchctl asuser "$console_uid" /usr/bin/sudo -u "$console_user" /usr/bin/open "$guide" >/dev/null 2>&1 || true
fi
exit 0
""", encoding='utf-8')
    postinstall.chmod(0o755)

    if not args.unsigned:
        subprocess.run(['codesign', '--force', '--timestamp', '--options', 'runtime', '--sign', args.app_sign_identity,
                        '--identifier', 'cn.live.it.mail-ai-assist.macos', str(native)], check=True)
        subprocess.run(['codesign', '--force', '--timestamp', '--options', 'runtime', '--sign', args.app_sign_identity,
                        '--entitlements', str(ROOT / 'installer/macos/node-entitlements.plist'), str(app / 'runtime/node')], check=True)
        for binary in [native, app / 'runtime/node']:
            subprocess.run(['codesign', '--verify', '--strict', '--verbose=2', str(binary)], check=True)
    output = ROOT / 'dist/macos' / version
    output.mkdir(parents=True, exist_ok=True)
    suffix = '-unsigned' if args.unsigned else ''
    package = output / f'Mail-AI-Assist-{version}-macos-{args.arch}{suffix}.pkg'
    if package.exists():
        parser.error(f'Refusing to overwrite {package}; archive the previous build first.')
    command = ['pkgbuild', '--root', str(payload), '--ownership', 'recommended', '--scripts', str(scripts),
               '--identifier', 'cn.live.it.mail-ai-assist.helper', '--version', version, '--install-location', '/']
    if not args.unsigned:
        command += ['--sign', args.installer_sign_identity]
    subprocess.run(command + [str(package)], check=True)
    if not args.unsigned:
        subprocess.run(['xcrun', 'notarytool', 'submit', str(package), '--keychain-profile', args.notary_profile, '--wait'], check=True)
        subprocess.run(['xcrun', 'stapler', 'staple', str(package)], check=True)
        subprocess.run(['pkgutil', '--check-signature', str(package)], check=True)
        subprocess.run(['spctl', '--assess', '--type', 'install', '--verbose', str(package)], check=True)
    print(package)

if __name__ == '__main__':
    main()
