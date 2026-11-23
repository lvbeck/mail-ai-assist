# Descrição sugerida para o ATN — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Resumo

Resuma, traduza e etiquete mensagens selecionadas; automatização opcional para novas mensagens recebidas.

## Descrição

O Mail AI Assist ajuda a tratar as mensagens que seleciona no Thunderbird: resumos, tradução, sugestões de etiquetas, reformulação do texto selecionado durante a composição e exportação local. Não analisa autonomamente toda a caixa de correio. Os resumos e as etiquetas automáticos aplicam-se apenas às novas mensagens da caixa de entrada das contas onde ativar explicitamente cada função.

## Funcionalidades

O clique direito no corpo da mensagem, incluindo ligações e imagens, abre o Assistente IA. Sem seleção, processa a mensagem completa. Com seleção, o resumo e a tradução enviam apenas esse texto, sem assunto nem restante corpo.

- **Resumos:** Extraia os pontos principais e as tarefas a realizar da mensagem selecionada. O idioma do resumo é independente dos idiomas da interface e da tradução; por predefinição, segue o sistema.
- **Tradução:** Escolha os idiomas de origem e destino ou detete automaticamente o idioma de origem. Configure Google Cloud Translation, Microsoft Azure Translator ou DeepL com a sua chave API. Sem um serviço configurado, é utilizado o modelo de IA selecionado.
- **Etiquetas e aliases:** Dê prioridade às etiquetas existentes do Thunderbird para reduzir duplicados semelhantes. Reveja e edite as sugestões manuais antes de confirmar. Associe, por exemplo, `Project Alpha` e `Project Beta` à etiqueta existente `Projects`. As regras comparam nomes completos e ignoram maiúsculas, minúsculas e espaços adicionais.
- **Reformulação do texto selecionado:** Selecione texto ao escrever ou responder, reveja a pré-visualização e confirme a substituição. A extensão nunca envia mensagens automaticamente.
- **Exportação local:** TXT exporta o conteúdo e permite excluir respostas citadas e reencaminhamentos. EML preserva a mensagem original completa, codificação, cabeçalhos, formatação e anexos, sem filtrar citações. A exportação não utiliza IA nem consome tokens. Escolha a pasta e a aplicação de ambiente de trabalho; o ficheiro fica selecionado no explorador para o arrastar ou anexar manualmente a uma conversa. Não é anexado nem enviado automaticamente. Fechar a janela mantém os ficheiros.
- **Cache persistente:** Os resumos e as traduções correspondentes são reutilizados ao reabrir, mesmo após reiniciar o Thunderbird. Tentar novamente solicita um novo resultado e atualiza a cache. Nas definições pode consultar o tamanho, abrir a pasta ou limpar a cache; os ficheiros exportados são limpos separadamente.
- **Dez idiomas de interface:** inglês, alemão, francês, italiano, espanhol, português, chinês simplificado e tradicional, japonês e coreano.

## Automatização opcional para novas mensagens

Os resumos e as etiquetas automáticos estão **desativados por predefinição em todas as contas**. Ative cada função separadamente no menu do assistente de IA, clicando com o botão direito numa conta. Só são tratadas novas mensagens recebidas na caixa de entrada das contas ativadas, sem analisar o histórico; mensagens já marcadas como lixo são ignoradas.

Os resumos automáticos ficam em cache para consulta posterior. As etiquetas automáticas são aplicadas diretamente com base nas etiquetas existentes e nos aliases, sem confirmação por mensagem, ao contrário das sugestões manuais. A automatização usa o fornecedor, modelo e idioma de saída selecionados, envia o conteúdo ao serviço e consome a respetiva quota. O limite predefinido de resumos automáticos é de 100 tentativas por conta e por dia, ajustável nas definições. Tentativas falhadas ou canceladas também contam. Este limite não se aplica às etiquetas automáticas.

Os resumos, traduções e etiquetas tratam o assunto e o corpo da mensagem, não o conteúdo dos anexos. Reveja os resultados da IA antes de os utilizar.

## Fornecedores e privacidade

Suporta autorização ChatGPT, OpenAI API, Gemini API, Claude API e Ollama. Selecione Ollama nas definições. Use `http://localhost:11434` neste computador ou introduza o endereço base do servidor, por exemplo um endereço HTTPS na rede Tailscale. Guarde e escolha um modelo da lista. O servidor selecionado processa o conteúdo das mensagens. Os servidores remotos, mesmo na rede local ou VPN, exigem HTTPS. HTTP só é aceite em endereços de loopback com porta explícita. Substitua os endereços HTTP remotos guardados pelos respetivos endereços HTTPS.

A permissão nativeMessaging liga o Thunderbird ao assistente local instalado separadamente (local.mail_ai_assist). Troca assunto/corpo solicitado ou texto selecionado, definições de fornecedor/modelo/idioma, credenciais introduzidas, resultados IA, cache e conteúdo/caminhos de exportação. EML inclui cabeçalhos originais e anexos. O assistente gere autenticação, pedidos HTTPS, credenciais protegidas, cache, exportação e abertura de aplicações. O texto relevante é enviado ao serviço IA ou de tradução escolhido; a exportação local não chama a IA. Windows usa DPAPI e macOS encriptação baseada no Porta-chaves. Cache e exportações são legíveis localmente. Aplicam-se condições e custos do fornecedor.

[Política de privacidade](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)

## Instalação e exportação

Requer Thunderbird 148 ou posterior e um assistente separado: Windows x64 (MSI), ou macOS 13+ em Apple Silicon ou Intel (PKG distintos). Transferir de GitHub Releases, instalar e reiniciar o Thunderbird. Os pacotes macOS não são assinados nem notarizados; os testes completos estão pendentes. Linux não é suportado. ATN atualiza a extensão; Windows mantém o atualizador independente e os pacotes macOS publicados requerem atualização manual.

[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)

Licença: MIT

Suporte: it@live.cn

https://github.com/lvbeck/mail-ai-assist/releases/latest
