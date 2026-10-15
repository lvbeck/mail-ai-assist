# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist añade resúmenes, traducción, sugerencias de etiquetas, reescritura de texto seleccionado y exportación local a Thunderbird. La versión 0.12.24 prepara descargas GitHub y actualizaciones ATN.

## Funciones

Idioma independiente para resúmenes. Resúmenes y traducciones se guardan en caché; Reintentar regenera. La automatización está desactivada por defecto y se habilita por cuenta para nuevos mensajes de entrada. Límite inicial: 100 intentos de resumen por cuenta y día. Reutiliza etiquetas y alias existentes. La reescritura requiere vista previa y confirmación; nunca envía mensajes automáticamente.

## Proveedores y privacidad

Admite autorización ChatGPT, Gemini API y Claude API. Traducción con Google Cloud Translation, Azure Translator o DeepL; sin servicio configurado usa el modelo IA elegido. Los errores no cambian de proveedor. Acceso y costes dependen del servicio. El contenido pertinente pasa por el asistente Windows al proveedor. Credenciales protegidas con DPAPI; caché y exportaciones legibles localmente. Consulta la [política](publication/PRIVACY.md).

## Instalación y exportación

Requiere asistente Windows x64: descarga MSI desde [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), instala y reinicia Thunderbird. Instala la extensión desde ATN cuando se publique o mediante XPI local. Mínimo declarado: Thunderbird 128; prueba las versiones utilizadas. Los enlaces no significan que ya esté publicado. TXT permite excluir citas; EML conserva el original y adjuntos. Carpeta configurable; los archivos se muestran para adjuntarlos manualmente y se conservan al cerrar. Puedes limpiar las exportaciones gestionadas en ajustes.

## Actualizaciones y migración

ATN actualiza la extensión; GitHub Releases aloja MSI y helper-updates.json firmado. Etiquetas vVERSION; la última publicación debe incluir el manifiesto. Redirecciones HTTPS limitadas al repositorio y release-assets.githubusercontent.com, conservando RSA, tamaño y SHA-256. Instala manualmente el nuevo MSI una vez para migrar asistentes antiguos. Sustituye el XPI autohospedado por el ATN del mismo ID; conservación de ajustes según Thunderbird. Se mantiene el ámbito de instalación usuario/equipo.

## Desarrollo

extension/: extensión; helper/: asistente; tests/, installer/, scripts/, publication/. dist/ y work/ no se versionan. Node.js 22+ y Python 3.10+. Pruebas y XPI no requieren dependencias npm; npm install y npm run icons solo para iconos.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## Compilar MSI

Requiere Windows x64, MSVC C++ Build Tools/Windows SDK, WiX 4.0.6 UI/Util y carpeta Node independiente con node.exe y NODE-LICENSE.txt. Ejecuta desde la raíz. WIX_EXE y VCVARS64 permiten elegir herramientas. Ajusta rutas y utiliza la clave DPAPI existente, sin reemplazarla para instalaciones existentes.

```powershell
dotnet tool install wix --version 4.0.6 --tool-path work/wix-tools
.\work\wix-tools\wix.exe extension add WixToolset.UI.wixext/4.0.6
.\work\wix-tools\wix.exe extension add WixToolset.Util.wixext/4.0.6
$env:MAIL_AI_RUNTIME_DIR = 'D:\build-tools\mail-ai-runtime'
$env:MAIL_AI_SIGNING_KEY_FILE = 'D:\private\update-signing-key.dpapi'
python installer/build-release.py
python installer/finalize-release.py
node installer/verify-release.mjs
```

## Publicación

Adjunta por separado los archivos de dist/github-release/v0.12.24/ a la Release, no solo un ZIP. Envía el XPI ATN con On this site. Consulta [revisión](publication/REVIEW-NOTES.md), [descripción](publication/LISTING.md), [procedimiento](publication/GITHUB-RELEASE.md). Los scripts no hacen push, subidas ni instalaciones automáticas. No incluyas claves, credenciales, correo ni caché; .gitignore no elimina secretos ya confirmados. MIT: [LICENSE](LICENSE).
