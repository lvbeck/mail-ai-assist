# Présentation proposée pour ATN — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Résumé

Résumez, traduisez et étiquetez les messages sélectionnés ; automatisez les nouveaux messages si vous le souhaitez.

## Description

Mail AI Assist vous aide à traiter les messages sélectionnés dans Thunderbird : résumés, traduction, suggestions d’étiquettes, reformulation du texte sélectionné pendant la rédaction et export local. L’extension ne parcourt pas spontanément toute votre boîte mail. Les résumés et étiquettes automatiques concernent uniquement les nouveaux messages de la boîte de réception des comptes pour lesquels vous activez explicitement chaque fonction.

## Fonctionnalités

Un clic droit dans le corps du message, y compris sur les liens et images, ouvre Assistant IA. Sans sélection, les actions traitent le message entier. Avec une sélection, le résumé et la traduction envoient uniquement ce texte, sans objet ni reste du corps.

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

Autorisation ChatGPT, Gemini API et Claude API sont pris en charge.

La permission nativeMessaging relie Thunderbird à l’assistant local installé séparément (local.mail_ai_assist). Elle échange l’objet/le corps demandé ou le texte sélectionné, les paramètres de fournisseur/modèle/langue, les identifiants saisis, les résultats IA, le cache et les contenus/chemins d’export. EML inclut les en-têtes originaux et pièces jointes. L’assistant gère l’authentification, les requêtes HTTPS, le stockage protégé des identifiants, le cache, l’export et l’ouverture d’applications. Le texte pertinent est envoyé au service IA ou de traduction choisi ; l’export local ne sollicite pas l’IA. Windows utilise DPAPI, macOS un chiffrement fondé sur le Trousseau. Cache et exports sont lisibles localement. Conditions et frais du fournisseur applicables.

[Politique de confidentialité](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)

## Installation et export

Thunderbird 148 ou ultérieur et un assistant séparé sont nécessaires : Windows x64 (MSI), ou macOS 13+ sur Apple Silicon ou Intel (PKG distincts). Télécharger depuis GitHub Releases, installer et redémarrer Thunderbird. Les paquets macOS ne sont ni signés ni notariés ; les tests complets restent à effectuer. Linux n’est pas pris en charge. ATN met à jour l’extension ; Windows conserve son mécanisme de mise à jour de l’assistant, les paquets macOS publiés nécessitent une mise à jour manuelle.

[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)

Licence: MIT

Assistance: it@live.cn

https://github.com/lvbeck/mail-ai-assist/releases/latest
