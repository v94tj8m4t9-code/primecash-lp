# PrimeCash — cópia da LP

Cópia da página pública https://primecashoficial.com.br/ capturada em 02/09/2026.
O documento, o CSS e o runtime publicado pelo Framer foram preservados. Imagens,
fontes e módulos estão em content/assets. Os rastreadores de audiência foram
retirados da cópia para evitar contabilizar acessos de revisão no site original.

## Alterar a copy

A versão de saúde utiliza apenas os componentes originais: nenhum novo layout,
CSS, imagem ou substituto do painel. As mensagens novas foram distribuídas pelos
campos existentes. Somente Rewards e a seção do aplicativo não confirmado foram
retirados, conforme o documento de direcionamento. O FAQ mantém a interação original.

Edite apenas o campo `texto` em `copy.json`, mantendo `original` e `id`.
O build aplica as alterações tanto no HTML inicial quanto nos textos dos módulos
do Framer, evitando que a hidratação restaure a copy anterior. O arquivo original
em content permanece como referência. Textos gravados dentro de imagens requerem
edição da própria imagem. O painel original deve ser mantido. Os CTAs de demonstração
abrem o e-mail institucional contato@primecashbrasil.com; o login segue no destino
original do cliente. Este projeto não duplica o sistema de pagamentos.

Execute `pnpm dev` para visualizar ou `pnpm build` para gerar `dist`.
O site é estático. Os arquivos auxiliares não utilizados do scaffold são excluídos
da versão entregue. Os scripts de instalação nativos não são necessários.
