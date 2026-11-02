# ProjectFlow AI — Direção de design

## Cena de uso
Equipes de engenharia, gestão e consultoria em escritório, sessões longas (2h+), desktop
como foco. Modo **Operate**: familiaridade e densidade são features; expressão visual é ruído.
Tema claro e escuro são primeira classe — o padrão segue o sistema operacional, com toggle.

## Identidade
Precisão industrial silenciosa. Nada de gradientes decorativos, barras de acento laterais,
emoji como ícone, eyebrows ou cards aninhados. Ícones são SVG autorais de traço único (1.5px).

## Tipografia
- **IBM Plex Sans** (texto e display) com fallback de sistema; **IBM Plex Mono** para
  identificadores (`PF-124`), payloads JSON e dados tabulares.
- Base 13px (densidade Operate). Escala: 11 / 12 / 13 / 14 / 16 / 19 / 24.
- Números que atualizam em `font-variant-numeric: tabular-nums`.
- Piso de leitura: 12px.

## Paleta (tokens semânticos — o escuro deriva dos mesmos tokens)

| Token | Claro | Escuro |
|---|---|---|
| `--bg` | `#F2F4F7` | `#0E1116` |
| `--surface` | `#FFFFFF` | `#161A21` |
| `--surface-2` (sunken) | `#EAEDF2` | `#10141A` |
| `--overlay` | `#FFFFFF` | `#1E242E` |
| `--ink` | `#1C2127` | `#E6E8EB` |
| `--ink-2` | `#55606E` | `#9BA3AE` |
| `--border` | `#D8DEE6` | `#262B33` |
| `--border-2` | `#B9C2CE` | `#333A44` |
| `--accent` | `#2B5FD9` | `#7FA0F4` (dessaturado e mais claro, não o mesmo hex) |
| `--ok` | `#1D7A4C` | `#63C98E` |
| `--warn` | `#9A5B00` | `#E0A95C` |
| `--danger` | `#BE3030` | `#E57A72` |

Regras: corpo ≥ 4.5:1 nos dois temas; âmbar nunca como tinta sobre claro em texto pequeno
(usamos `#9A5B00`, que passa AA); elevação no escuro por superfície mais clara, não por sombra;
troca de tema sem transições (flash killer).

## Espaços, raios, sombra
- Escala de espaçamento: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Raios: 6px (controles), 8px (painéis), 10px (overlays).
- Sombra apenas em overlays (menu, drawer, modal): deslocada e com blur, nunca halo.

## Componentes — estados não-negociáveis
Todo interativo entrega default, hover, pressionado, foco (anel visível `--accent` 2px),
desabilitado, carregando e erro. Selo de estado nunca encosta em botão (coluna de ação com
largura reservada). Scrollbar, seleção de texto e caret tematizados.

## Prioridades e status (linguagem visual)
- Prioridade: glifo próprio (chevrons empilhados) + cor — urgente/alta/média/baixa.
- Status: ponto/anel de progresso estilo Linear — backlog (tracejado), a fazer (vazio),
  em andamento (meio), em revisão (3/4), concluído (cheio, verde).
- Tipo: épico (losango roxo), tarefa (círculo azul), bug (octógono vermelho), subtarefa (ramo).
