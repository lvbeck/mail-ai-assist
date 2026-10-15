# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

O Mail AI Assist ajuda a tratar as mensagens que seleciona no Thunderbird: resumos, tradução, sugestões de etiquetas, reformulação do texto selecionado durante a composição e exportação local. Não analisa autonomamente toda a caixa de correio. Os resumos e as etiquetas automáticos aplicam-se apenas às novas mensagens da caixa de entrada das contas onde ativar explicitamente cada função.

## Funcionalidades

- **Resumos:** Extraia os pontos principais e as tarefas a realizar da mensagem selecionada. O idioma do resumo é independente dos idiomas da interface e da tradução; por predefinição, segue o sistema.
- **Tradução:** Escolha os idiomas de origem e destino ou detete automaticamente o idioma de origem. Configure Google Cloud Translation, Microsoft Azure Translator ou DeepL com a sua chave API. Sem um serviço configurado, é utilizado o modelo de IA selecionado.
- **Etiquetas e aliases:** Dê prioridade às etiquetas existentes do Thunderbird para reduzir duplicados semelhantes. Reveja e edite as sugestões manuais antes de confirmar. Associe, por exemplo, `ZUB Helena` e `Helena Ultra` à etiqueta existente `Helena`. As regras comparam nomes completos e ignoram maiúsculas, minúsculas e espaços adicionais.
- **Reformulação do texto selecionado:** Selecione texto ao escrever ou responder, reveja a pré-visualização e confirme a substituição. A extensão nunca envia mensagens automaticamente.
- **Exportação local:** TXT exporta o conteúdo e permite excluir respostas citadas e reencaminhamentos. EML preserva a mensagem original completa, codificação, cabeçalhos, formatação e anexos, sem filtrar citações. A exportação não utiliza IA nem consome tokens. Escolha a pasta e a aplicação de ambiente de trabalho; o ficheiro fica selecionado no explorador para o arrastar ou anexar manualmente a uma conversa. Não é anexado nem enviado automaticamente. Fechar a janela mantém os ficheiros.
- **Cache persistente:** Os resumos e as traduções correspondentes são reutilizados ao reabrir, mesmo após reiniciar o Thunderbird. Tentar novamente solicita um novo resultado e atualiza a cache. Nas definições pode consultar o tamanho, abrir a pasta ou limpar a cache; os ficheiros exportados são limpos separadamente.
- **Dez idiomas de interface:** inglês, alemão, francês, italiano, espanhol, português, chinês simplificado e tradicional, japonês e coreano.

## Automatização opcional para novas mensagens

Os resumos e as etiquetas automáticos estão **desativados por predefinição em todas as contas**. Ative cada função separadamente no menu do assistente de IA, clicando com o botão direito numa conta. Só são tratadas novas mensagens recebidas na caixa de entrada das contas ativadas, sem analisar o histórico; mensagens já marcadas como lixo são ignoradas.

Os resumos automáticos ficam em cache para consulta posterior. As etiquetas automáticas são aplicadas diretamente com base nas etiquetas existentes e nos aliases, sem confirmação por mensagem, ao contrário das sugestões manuais. A automatização usa o fornecedor, modelo e idioma de saída selecionados, envia o conteúdo ao serviço e consome a respetiva quota. O limite predefinido de resumos automáticos é de 100 tentativas por conta e por dia, ajustável nas definições. Tentativas falhadas ou canceladas também contam. Este limite não se aplica às etiquetas automáticas.

Os resumos, traduções e etiquetas tratam o assunto e o corpo da mensagem, não o conteúdo dos anexos. Reveja os resultados da IA antes de os utilizar.

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
