# Aceite da Etapa 1

Referência: [blueprint atualizado fornecido pelo usuário](BLUEPRINT.md).

| Critério                                     | Implementação e evidência                                                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login, sessão, saída e projeto próprio       | `/login`, cookie HTTP-only assinado, proteção de layout/APIs, cadastro em `/projetos` e detalhe dinâmico. Teste de navegador cria projeto, navega até sua página e valida saída/401.                                                              |
| Recorrência parcial e caixa/competência      | `addEntry` gera ocorrências mensais idempotentes; `settle` registra conta/data real; restante calculado pelas baixas/estornos. Teste usa competência janeiro e baixa parcial fevereiro, conferindo DRE e caixa.                                   |
| Duas empresas / CNPJs / movimento vinculado  | Seed com duas empresas e contas próprias. `transfer` preserva origem/destino e natureza; testes comparam saldos separados, consolidado, totais e DRE.                                                                                             |
| Rateio e repasse                             | `distribute` usa maiores restos; baixas rateiam pelo saldo das parcelas, estornos preservam a parcela original. Testes quitam 101 centavos em 101 baixas e validam total exato em três destinos. Repasse muda atribuição sem criar caixa.         |
| Pessoa em dois vínculos / devolução de sócio | Rafael tem dois vínculos; geração idempotente por vínculo/competência, histórico único por pessoa. Testes validam os dois e devolução limitada ao adiantamento recebido.                                                                          |
| Gráficos/tabelas e compilação                | Todos usam `finance.ts` e a mesma base retornada pela API. Fluxo diário valida saldos; gráfico tem tabela acessível com os mesmos valores. Build de produção e typecheck.                                                                         |
| Meu Financeiro / titular                     | Repositório só retorna o espaço do principal obtido da sessão. Testes de domínio e HTTP direto tentam consultar/editar dados de outro titular e usar sua categoria/fonte; rejeitados. Cada baixa pessoal tem chave idempotente e estorno inverso. |

## Verificações

- `npm test`: testes financeiros e isolamento pessoal (Node test runner).
- `npm run typecheck`: TypeScript estrito.
- `npm run build`: compilação Next.js de produção.
- `npm run test:browser`: Chromium/Playwright; login/rotas, todos os módulos, criação de projeto, lançamento/baixa parcial, isolamento pessoal via HTTP, viewport 390px e logout. Capturas em `/tmp/cr-dashboard-desktop.png` e `/tmp/cr-dashboard-mobile.png`.

O teste de navegador valida os fluxos listados; não representa certificação de produção, teste exaustivo de todos os formulários ou RLS. Não existem Supabase, migrações executadas, integração bancária ou autorização real nesta fase. A base demonstra comportamento financeiro com dados fictícios e políticas explicitamente provisórias. Contratos/anexos são locais; permissões granulares, armazenamento privado externo, autenticidade de identidade e RLS ficam para a Etapa 2.

## Resultado da validação desta entrega

`npm ci` concluído; 14 testes de domínio passaram; TypeScript e build de produção passaram. Os sete cenários do teste de navegador passaram tanto no servidor de desenvolvimento quanto no servidor de produção, sem erros JavaScript. O armazenamento local permaneceu disponível após reiniciar o processo.
