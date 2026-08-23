# 📋 Pauta

Um app de tarefas simples, rápido e visualmente cuidado — feito para organizar a faculdade e o dia a dia sem a fricção de ferramentas mais pesadas. Roda 100% no navegador, sem servidor, sem cadastro e sem depender de internet para funcionar.

Nasceu de uma frustração real com ferramentas como o Notion na hora de lidar com **tarefas recorrentes**: aqui, uma tarefa diária ou semanal fica marcada como concluída pelo resto do dia e só reaparece pendente depois da virada da meia-noite — sem sumir, duplicar ou confundir o histórico.

## ✨ Funcionalidades

- **CRUD completo de tarefas** — criar, editar, concluir e excluir, com confirmação antes de apagar.
- **Etapas (subtarefas)** — cada tarefa pode ter uma lista de etapas simples (título + checkbox), úteis para quebrar um trabalho grande em passos menores.
- **Descrição** — campo livre na tarefa principal para anotar detalhes, links ou contexto.
- **Timer com recorrência** — tarefas *e* etapas podem ter data, hora e uma repetição (nenhuma, diária ou semanal).
- **Conclusão inteligente de recorrentes** — ao marcar uma tarefa recorrente como concluída, ela (e suas etapas) ficam marcadas até 00:00. Depois da virada do dia, tudo é reaberto automaticamente e a data avança para a próxima ocorrência.
- **Busca** — filtra tarefas por título, descrição ou título das etapas em tempo real.
- **Filtros rápidos** — Todas, Hoje, Esta semana, Recorrentes e Concluídas, cada um com contador.
- **Indicadores de prazo** — badges coloridos (no prazo, hoje, atrasada, concluída) para saber o status de cada item de relance.
- **Interface inspirada no Notion** — cabeçalho fixo, barra de pesquisa e barra lateral de navegação, com um layout limpo no conteúdo principal.
- **Totalmente responsivo** — a barra lateral vira uma barra de filtros horizontal em telas pequenas, e os componentes mantêm proporção sem quebrar.
- **Dados 100% locais** — tudo é salvo no `localStorage` do navegador. Nenhuma informação sai do seu dispositivo.

## 🚀 Como usar

Não há instalação, build ou dependências.

1. Baixe o arquivo [`pauta.html`](./pauta.html).
2. Abra ele com duplo clique no seu navegador (Chrome, Firefox, Edge, Safari...).
3. Pronto — comece a criar suas tarefas.

> ⚠️ Como os dados ficam salvos no `localStorage` daquele navegador específico, abrir o arquivo em outro computador ou navegador começa com a lista vazia. Não há sincronização entre dispositivos.

### Hospedar como site (opcional)

Se preferir acessar por uma URL em vez de abrir o arquivo localmente, basta publicar o `pauta.html` em qualquer serviço de hospedagem estática, por exemplo:

- **GitHub Pages** — habilite em *Settings → Pages* apontando para a branch/pasta onde está o arquivo.
- **Netlify / Vercel** — arraste a pasta do projeto para o deploy manual.

Como o app não tem backend, qualquer hospedagem de arquivos estáticos funciona.

## 🗂️ Estrutura do projeto

```
.
├── pauta.html   # aplicação completa (HTML + CSS + JS em um único arquivo)
└── README.md
```

Tudo — marcação, estilos e lógica — vive em um único arquivo autocontido, sem build step.

## 🛠️ Tecnologias

- **HTML5**
- **CSS3** puro (variáveis CSS, Grid e Flexbox, sem frameworks)
- **JavaScript** vanilla (sem dependências externas)
- **Google Fonts** — [Fraunces](https://fonts.google.com/specimen/Fraunces), [Inter](https://fonts.google.com/specimen/Inter) e [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- **Web Storage API** (`localStorage`) para persistência

## 🧠 Como funciona a recorrência

Cada tarefa (e cada etapa) pode ter `repeat` igual a `none`, `daily` ou `weekly`.

- Ao marcar como concluída uma tarefa/etapa recorrente, ela grava a data de conclusão (`completedDate`) e permanece marcada.
- A cada minuto (e ao abrir o app), uma rotina de *rollover* verifica se a data de conclusão já ficou no passado. Se sim, a tarefa é reaberta e sua data (`dueDate`) avança automaticamente para a próxima ocorrência.
- Concluir a tarefa "mãe" marca também todas as suas etapas; quando a mãe reabre no dia seguinte, as etapas reabrem junto.

## 📌 Roadmap / ideias futuras

- [ ] Exportar / importar backup dos dados (JSON)
- [ ] Tags ou categorias por tarefa (ex: Faculdade, Pessoal)
- [ ] Modo escuro
- [ ] Notificações do navegador para tarefas com horário definido

Sugestões e contribuições são bem-vindas — abra uma *issue* ou um *pull request*.

## 📄 Licença

Distribua e use livremente. Se quiser, adicione aqui a licença de sua preferência (ex: [MIT](https://choosealicense.com/licenses/mit/)).
