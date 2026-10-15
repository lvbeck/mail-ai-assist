# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist ajoute à Thunderbird résumés, traduction, suggestions d’étiquettes, réécriture de texte sélectionné et export local. La version 0.12.24 prépare les téléchargements GitHub et les mises à jour ATN.

## Fonctions

La langue des résumés est indépendante. Résumés et traductions sont conservés en cache ; Réessayer les régénère. Les résumés et étiquettes automatiques sont désactivés par défaut et activables par compte pour les nouveaux messages reçus. Limite initiale : 100 tentatives de résumé par compte et par jour. Les étiquettes existantes et alias sont réutilisés. La réécriture nécessite aperçu et confirmation ; aucun envoi automatique.

## Services et confidentialité

Autorisation ChatGPT, Gemini API et Claude API sont pris en charge. La traduction peut utiliser Google Cloud Translation, Azure Translator ou DeepL ; sans service configuré, le modèle IA choisi est utilisé. Aucun changement de fournisseur après une erreur. Accès et coûts dépendent du fournisseur. Les contenus pertinents passent par l’assistant Windows vers le service choisi. Identifiants protégés par DPAPI ; cache et exports lisibles localement. Voir la [politique](publication/PRIVACY.md).

## Installation et export

Assistant Windows x64 requis : télécharger le MSI depuis [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), installer et redémarrer Thunderbird. Installer l’extension via ATN après publication, ou manuellement depuis le XPI. Minimum déclaré : Thunderbird 128 ; tester les versions utilisées. Ces liens ne signifient pas qu’une publication existe déjà. TXT peut exclure les citations ; EML conserve le message original et les pièces jointes. Dossier d’export configurable ; fichiers affichés pour ajout manuel et conservés à la fermeture. Nettoyage disponible dans les paramètres.

## Mises à jour et migration

ATN met à jour l’extension ; GitHub Releases héberge le MSI et helper-updates.json signé. Les tags suivent vVERSION et la dernière publication doit contenir le manifeste. Redirections HTTPS limitées au dépôt et à release-assets.githubusercontent.com ; vérification RSA, taille et SHA-256 conservée. Les anciens assistants nécessitent une installation manuelle unique du nouveau MSI. Remplacer l’ancien XPI auto-hébergé par celui d’ATN avec le même ID ; conservation des réglages selon Thunderbird. Le mode d’installation utilisateur/machine est conservé.

## Développement

extension/ : extension ; helper/ : assistant ; tests/, installer/, scripts/, publication/. dist/ et work/ ne sont pas versionnés. Node.js 22+ et Python 3.10+ requis. Tests et XPI sans dépendances npm ; npm install et npm run icons uniquement pour régénérer les icônes.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## Construire le MSI

Windows x64, MSVC C++ Build Tools et Windows SDK, WiX 4.0.6 avec UI/Util et dossier Node autonome contenant node.exe et NODE-LICENSE.txt requis. Exécuter à la racine du dépôt. WIX_EXE et VCVARS64 permettent de choisir les outils. Adapter les chemins et utiliser la clé DPAPI existante, sans la remplacer pour les installations existantes.

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

## Publication

Joindre séparément les fichiers de dist/github-release/v0.12.24/ à la Release, pas seulement un ZIP. Soumettre le XPI ATN avec On this site. Voir [notes de revue](publication/REVIEW-NOTES.md), [description](publication/LISTING.md), [procédure](publication/GITHUB-RELEASE.md). Aucun push, téléversement ou installation automatique. Ne pas versionner clés, identifiants, courriels ou caches ; .gitignore ne supprime pas les secrets déjà commités. MIT : [LICENSE](LICENSE).
