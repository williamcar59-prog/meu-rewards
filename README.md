# Rewards Tracker

PWA (app instalável) para gerenciar e contabilizar seus **Microsoft Rewards**: saldo, metas com previsão, checklist diário com streak, estatísticas e histórico de resgates — com suporte a **múltiplas contas**.

## Como rodar

```bash
npm install
npm run dev        # modo desenvolvimento (http://localhost:5173)
npm run build      # gera a versão de produção em dist/
npm run preview    # serve a versão de produção para testar
```

### Instalar como app (PWA)

1. Rode `npm run preview` (ou hospede o `dist/`).
2. Abra no **Edge** ou **Chrome**.
3. No menu do navegador, escolha **"Instalar Rewards Tracker"** (ícone na barra de endereço).
4. Ele funcionará offline e aparecerá como app no menu Iniciar.

## Funcionalidades

- **Resumo**: saldo somado de todas as contas, ganhos hoje/semana/mês, gráficos.
- **Contas** (uma aba por conta):
  - **Checklist diário**: marque tarefas (pesquisa PC/celular, Daily Set, Xbox/Game Pass, Edge/MSN, missões semanais/mensais) e os pontos entram automaticamente na carteira.
  - **Streak**: dias consecutivos com o checklist completo, com recorde.
  - **Carteira**: saldo, lançar ganhos e resgates (com valor em R$).
  - **Meta**: escolha a recompensa e veja a **previsão de data** pelo seu ritmo médio (7/30 dias).
  - **Estatísticas**: evolução do saldo e ganhos por categoria.
- **Resgates**: histórico em R$, total resgatado e valor médio do ponto.
- **Configurações**: gerenciar contas e tarefas, tema claro/escuro, lembretes por notificação, cotação USD→BRL.

## Dados e backup

- Tudo fica salvo **localmente no navegador** (IndexedDB).
- **Sincronização com OneDrive**: em *Configurações → Dados*, conecte um arquivo `.json` dentro da pasta do OneDrive (ex.: `PROJETOS\REWARDS\rewards-data.json`). O app grava nele a cada alteração (requer Edge/Chrome, File System Access API). Use em um aparelho por vez — o último salvamento vence.
- **Exportar/importar backup**: gere um `.json` de backup ou restaure um anterior.

## Nota sobre automação

Este app é de **lançamento manual** (checklist + registro). Ele não acessa a Microsoft Rewards automaticamente, porque a Microsoft não oferece API oficial e automatizar a cota de pesquisa pode violar os termos e levar à suspensão da conta. Por isso, marcar o checklist leva poucos segundos por dia.

## Stack

Vite + React + TypeScript + Recharts + vite-plugin-pwa. Visual estilo Fluent (Microsoft).
