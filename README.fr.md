# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist vous aide à traiter les messages sélectionnés dans Thunderbird : résumés, traduction, suggestions d’étiquettes, reformulation du texte sélectionné pendant la rédaction et export local. L’extension ne parcourt pas spontanément toute votre boîte mail. Les résumés et étiquettes automatiques concernent uniquement les nouveaux messages de la boîte de réception des comptes pour lesquels vous activez explicitement chaque fonction.

## Fonctionnalités

- **Résumés :** Retrouvez les points essentiels et les actions à effectuer dans le message sélectionné. La langue du résumé est indépendante de celles de l’interface et de la traduction ; elle suit par défaut la langue du système.
- **Traduction :** Choisissez les langues source et cible, ou détectez automatiquement la langue source. Configurez Google Cloud Translation, Microsoft Azure Translator ou DeepL avec votre propre clé API. Sans service de traduction configuré, le modèle d’IA sélectionné est utilisé.
- **Étiquettes et alias :** Réutilisez en priorité les étiquettes Thunderbird existantes pour limiter les doublons proches. Les suggestions manuelles sont modifiables avant confirmation. Associez par exemple `Project Alpha` et `Project Beta` à l’étiquette existante `Projects`. Les règles comparent les noms complets, sans tenir compte de la casse ni des espaces superflus.
- **Reformulation :** Sélectionnez du texte dans une nouvelle rédaction ou une réponse, examinez l’aperçu, puis confirmez son remplacement. L’extension n’envoie jamais les messages automatiquement.
- **Export local :** TXT exporte le contenu et permet d’exclure les réponses citées et les transferts. EML conserve le message original complet, son encodage, ses en-têtes, sa mise en forme et ses pièces jointes, sans exclure les citations. L’export ne fait pas appel à l’IA et ne consomme aucun token. Choisissez le dossier et l’application de bureau ; le fichier est sélectionné dans l’explorateur pour être glissé ou joint manuellement à une conversation. Aucune pièce jointe ni aucun envoi automatique. Fermer la fenêtre conserve les fichiers.
- **Cache persistant :** Les résumés et traductions correspondants sont réutilisés à la réouverture, même après un redémarrage de Thunderbird. Réessayer demande un nouveau résultat et actualise le cache. Les paramètres permettent de consulter sa taille, d’ouvrir son dossier ou de le vider ; les exports se nettoient séparément.
- **Dix langues d’interface :** anglais, allemand, français, italien, espagnol, portugais, chinois simplifié et traditionnel, japonais et coréen.

## Automatisation facultative des nouveaux messages

Les résumés et étiquettes automatiques sont **désactivés par défaut pour chaque compte**. Activez-les séparément dans le menu de l’assistant IA accessible par clic droit sur le compte. Seuls les nouveaux messages reçus dans la boîte de réception des comptes activés sont traités, sans analyser l’historique ; les messages déjà marqués comme indésirables sont ignorés.

Les résumés automatiques sont conservés en cache pour consultation ultérieure. Les étiquettes automatiques sont appliquées directement selon les étiquettes existantes et les alias, sans confirmation pour chaque message, contrairement aux suggestions manuelles. L’automatisation utilise le fournisseur, le modèle et la langue de sortie choisis, transmet le contenu au service et consomme son quota. La limite des résumés automatiques est de 100 tentatives par compte et par jour par défaut, modifiable dans les paramètres. Les échecs et annulations comptent aussi. Cette limite ne concerne pas les étiquettes automatiques.

Les résumés, traductions et étiquettes traitent l’objet et le corps du message, pas le contenu des pièces jointes. Vérifiez les résultats de l’IA avant de vous y fier.

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
