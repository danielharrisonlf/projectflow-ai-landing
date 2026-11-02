# ProjectFlow AI: landing oficial

Landing independente em português, construída com Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS e next-themes. Fontes IBM Plex servidas localmente. Temas claro, escuro e sistema, sem transição na troca.

## Executar

Requer Node.js 24 e npm.

```powershell
npm ci
npm run dev
```

## Verificar

```powershell
npm run typecheck
npm run build
npm run start
# Em outro terminal, com o servidor em localhost:3000:
npm test
```

Os testes Playwright verificam temas e persistência, tabs por teclado, navegação mobile, overflow, assets, metadados, acessibilidade com axe e console MCP da demonstração. Evidências e resultados estão em `evidence/QA.md`.

## Capturas autênticas

`public/assets/screenshots/manifest.json` registra repositório, commit de origem, rotas, data, resoluções e tamanho dos arquivos. São sete visões em dois temas e duas resoluções: 1440×900 e 2880×1800. Os 28 WebPs totalizam aproximadamente 3,5 MB, carregados conforme o contexto.

Para recapturar a partir do repositório irmão:

```powershell
npx playwright install chromium
npm run capture
node scripts/social-image.mjs
```

É possível definir `PROTOTYPE_DIR` para outra cópia do protótipo. O script serve a fonte temporariamente em 127.0.0.1:4173, usa armazenamento isolado e não modifica os arquivos originais. PNGs retina ficam em `evidence/raw/`, ignorados pelo Git. Os WebPs são distribuídos no repositório.

## Demonstração

`public/demo/` contém uma cópia estática versionada do [protótipo original](https://github.com/danielharrisonlf/projectflow-ai-prototipo). Consulte `public/demo/PROVENANCE.md`. O CTA funciona sem serviços externos ou ambiente local.

A demonstração não tem backend. IA, endpoint MCP e entregas de webhooks/notificações são simulados. As ferramentas executam sobre dados locais, com validação de capacidades e auditoria local. A landing distingue esses fluxos das propostas de infraestrutura de produção. Não há formulário de captura, analytics ou cookies de marketing.

## Publicar

Defina `NEXT_PUBLIC_SITE_URL` com a origem de produção caso use outro domínio. Ela alimenta canonical, Open Graph, robots e sitemap. A origem padrão é `https://projectflow-ai.vercel.app`.

```powershell
npm run typecheck
npm run build
gh repo create projectflow-ai-landing --public --source=. --remote=origin --push
vercel --prod --yes --name projectflow-ai
```

Next 15.5.28 inclui as correções oficiais de outubro de 2026. O override de PostCSS atualiza sua dependência transitiva mantendo a major 15 solicitada. TypeScript 5.9 foi usado para compatibilidade com o carregador de configuração desta versão do Next.

## Direção visual

Precisão industrial silenciosa, fiel ao DESIGN.md original. Tokens semânticos, raios de 6/8/10px e escala de espaços de 4/8/12/16/24/32/48px. A landing amplia a tipografia do produto para a leitura de marketing. Variância 4, movimento 2, densidade 4: ênfase em evidência e clareza operacional.

Copy em português; tradução para inglês não faz parte desta versão. Todas as imagens de produto são capturas reais. O grafo e o diff em HTML são exemplos explicitamente ilustrativos, sem métricas de adoção ou certificações inventadas.
