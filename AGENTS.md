<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Grupo C&R Digital

- A referência de produto é `docs/BLUEPRINT.md`; a demonstração corresponde à Etapa 1.
- Preserve valores em centavos, datas de negócio em America/Sao_Paulo e a separação entre `finance.ts`, operações e repositório.
- Nunca misture dados pessoais e empresariais. O titular pessoal vem da sessão do servidor, não do payload.
- Supabase, autenticação real e migrações pertencem à Etapa 2. Todas as tabelas novas devem começar com `holding_`.
- Use o checkout existente nesta tarefa isolada; não crie worktree sem pedido explícito.
- Valide alterações financeiras com `npm test`, `npm run typecheck` e `npm run build`. Para fluxos de interface, use `npm run test:browser` com um servidor local em execução.
