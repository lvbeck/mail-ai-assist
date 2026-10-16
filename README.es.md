# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist te ayuda con los correos que seleccionas en Thunderbird: resúmenes, traducción, sugerencias de etiquetas, reescritura del texto seleccionado al redactar y exportación local. No analiza por iniciativa propia todo el buzón. Los resúmenes y las etiquetas automáticos solo se generan para mensajes nuevos de la bandeja de entrada de las cuentas donde habilites expresamente cada función.

## Funciones

- **Resúmenes:** Extrae los puntos principales y las tareas pendientes del mensaje seleccionado. El idioma del resumen es independiente de los de la interfaz y la traducción; por defecto sigue el idioma del sistema.
- **Traducción:** Elige los idiomas de origen y destino o detecta automáticamente el de origen. Configura Google Cloud Translation, Microsoft Azure Translator o DeepL con tu propia clave API. Sin un servicio configurado, se usa el modelo de IA seleccionado.
- **Etiquetas y alias:** Prioriza las etiquetas existentes de Thunderbird para reducir duplicados similares. Revisa y edita las sugerencias manuales antes de confirmarlas. Por ejemplo, asocia `Project Alpha` y `Project Beta` con la etiqueta existente `Projects`. Las reglas comparan nombres completos e ignoran mayúsculas y espacios adicionales.
- **Reescritura del texto seleccionado:** Selecciona texto al redactar o responder, revisa la vista previa y confirma su sustitución. La extensión nunca envía correos automáticamente.
- **Exportación local:** TXT exporta el contenido y permite excluir respuestas citadas y reenvíos. EML conserva el mensaje original completo, su codificación, cabeceras, formato y adjuntos, sin filtrar las citas. Exportar no llama a la IA ni consume tokens. Elige la carpeta y la aplicación de escritorio; el archivo queda seleccionado en el explorador para arrastrarlo o adjuntarlo manualmente a una conversación. No se adjunta ni se envía automáticamente. Los archivos se conservan al cerrar el diálogo.
- **Caché persistente:** Al volver a abrir un resultado se reutilizan los resúmenes y traducciones coincidentes, incluso tras reiniciar Thunderbird. Reintentar solicita un resultado nuevo y actualiza la caché. En los ajustes puedes consultar su tamaño, abrir su carpeta o vaciarla; los archivos exportados se limpian por separado.
- **Diez idiomas de interfaz:** inglés, alemán, francés, italiano, español, portugués, chino simplificado y tradicional, japonés y coreano.

## Automatización opcional de mensajes nuevos

Los resúmenes y las etiquetas automáticos están **desactivados por defecto en todas las cuentas**. Actívalos por separado desde el menú del asistente IA al hacer clic derecho en una cuenta. Solo se procesan mensajes recién recibidos en la bandeja de entrada de cuentas habilitadas, sin analizar correos históricos; se omiten los ya marcados como correo no deseado.

Los resúmenes automáticos se guardan en caché para consultarlos después. Las etiquetas automáticas se aplican directamente según las etiquetas existentes y los alias, sin confirmar cada mensaje como con las sugerencias manuales. Se usan el proveedor, el modelo y el idioma de salida seleccionados; el contenido se envía al servicio y consume su cuota. El límite predeterminado de resúmenes automáticos es de 100 intentos por cuenta y día, configurable en los ajustes. Los intentos fallidos o cancelados también cuentan. Este límite no se aplica a las etiquetas automáticas.

Los resúmenes, las traducciones y las etiquetas procesan el asunto y el cuerpo del mensaje, no el contenido de los adjuntos. Revisa los resultados de la IA antes de utilizarlos.

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

Adjunta por separado los archivos de dist/github-release/v0.12.25/ a la Release, no solo un ZIP. Envía el XPI ATN con On this site. Consulta [revisión](publication/REVIEW-NOTES.md), [descripción](publication/LISTING.md), [procedimiento](publication/GITHUB-RELEASE.md). Los scripts no hacen push, subidas ni instalaciones automáticas. No incluyas claves, credenciales, correo ni caché; .gitignore no elimina secretos ya confirmados. MIT: [LICENSE](LICENSE).
