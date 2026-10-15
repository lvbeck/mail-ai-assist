# Descrição sugerida para o ATN — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Resumo

Resuma, traduza e etiquete mensagens selecionadas; automatização opcional para novas mensagens recebidas.

## Descrição

O Mail AI Assist ajuda a tratar as mensagens que seleciona no Thunderbird: resumos, tradução, sugestões de etiquetas, reformulação do texto selecionado durante a composição e exportação local. Não analisa autonomamente toda a caixa de correio. Os resumos e as etiquetas automáticos aplicam-se apenas às novas mensagens da caixa de entrada das contas onde ativar explicitamente cada função.

## Funcionalidades

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

Suporta autorização ChatGPT, Gemini API e Claude API. Tradução com Google Cloud Translation, Azure Translator ou DeepL; sem serviço configurado utiliza o modelo IA selecionado. Erros não mudam o fornecedor. Acesso e custos dependem do serviço. Conteúdos relevantes passam pelo assistente Windows ao fornecedor. Credenciais protegidas por DPAPI; cache e exportações legíveis localmente. Consulte a [política](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md).

## Instalação e exportação

Requer assistente Windows x64: transfira MSI de [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), instale e reinicie o Thunderbird. Instale a extensão pelo ATN após publicação ou por XPI local. Mínimo declarado: Thunderbird 128; teste as versões utilizadas. Os links não significam que já foi publicado. TXT pode excluir citações; EML preserva original e anexos. Pasta configurável; ficheiros apresentados para anexação manual e mantidos ao fechar. Pode limpar exportações geridas nas definições.

Licença: MIT

Suporte: it@live.cn

Assistente Windows: https://github.com/lvbeck/mail-ai-assist/releases/latest
