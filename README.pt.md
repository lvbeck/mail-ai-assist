# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist adiciona resumos, tradução, sugestões de etiquetas, reescrita de texto selecionado e exportação local ao Thunderbird. A versão 0.12.24 prepara transferências GitHub e atualizações ATN.

## Funcionalidades

Idioma dos resumos independente. Resumos e traduções ficam em cache persistente; Repetir gera novamente. Automatismos desativados por predefinição e ativáveis por conta para novas mensagens recebidas. Limite inicial: 100 tentativas de resumo por conta e dia. Reutiliza etiquetas e aliases existentes. A reescrita exige pré-visualização e confirmação; nunca envia mensagens automaticamente.

## Fornecedores e privacidade

Suporta autorização ChatGPT, Gemini API e Claude API. Tradução com Google Cloud Translation, Azure Translator ou DeepL; sem serviço configurado utiliza o modelo IA selecionado. Erros não mudam o fornecedor. Acesso e custos dependem do serviço. Conteúdos relevantes passam pelo assistente Windows ao fornecedor. Credenciais protegidas por DPAPI; cache e exportações legíveis localmente. Consulte a [política](publication/PRIVACY.md).

## Instalação e exportação

Requer assistente Windows x64: transfira MSI de [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), instale e reinicie o Thunderbird. Instale a extensão pelo ATN após publicação ou por XPI local. Mínimo declarado: Thunderbird 128; teste as versões utilizadas. Os links não significam que já foi publicado. TXT pode excluir citações; EML preserva original e anexos. Pasta configurável; ficheiros apresentados para anexação manual e mantidos ao fechar. Pode limpar exportações geridas nas definições.

## Atualizações e migração

ATN atualiza a extensão; GitHub Releases aloja MSI e helper-updates.json assinado. Tags vVERSION; a última publicação deve conter o manifesto. Redirecionamentos HTTPS limitados ao repositório e release-assets.githubusercontent.com; verificações RSA, tamanho e SHA-256 mantidas. Instale manualmente o novo MSI uma vez para migrar assistentes antigos. Substitua o XPI anterior pelo ATN com o mesmo ID; preservação das definições conforme o Thunderbird. Mantém-se o âmbito de instalação utilizador/máquina.

## Desenvolvimento

extension/: extensão; helper/: assistente; tests/, installer/, scripts/, publication/. dist/ e work/ não são versionados. Node.js 22+ e Python 3.10+. Testes e XPI não requerem dependências npm; npm install e npm run icons apenas para ícones.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## Compilar MSI

Requer Windows x64, MSVC C++ Build Tools/Windows SDK, WiX 4.0.6 UI/Util e pasta Node autónoma com node.exe e NODE-LICENSE.txt. Execute na raiz. WIX_EXE e VCVARS64 permitem escolher ferramentas. Adapte os caminhos e use a chave DPAPI existente, sem a substituir para instalações existentes.

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

## Publicação

Anexe separadamente os ficheiros de dist/github-release/v0.12.24/ à Release, não apenas um ZIP. Submeta o XPI ATN com On this site. Consulte [revisão](publication/REVIEW-NOTES.md), [descrição](publication/LISTING.md), [procedimento](publication/GITHUB-RELEASE.md). Os scripts não fazem push, carregamentos nem instalações automáticas. Não versione chaves, credenciais, correio ou cache; .gitignore não remove segredos já registados. MIT: [LICENSE](LICENSE).
