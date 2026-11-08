# Etapa 2: modelo proposto e passagem ao v0

Este documento é uma proposta; não executa SQL nem altera o Supabase compartilhado. Conferir esquema existente e nomes, testar em ambiente isolado e revisar migrações antes de aplicar.

## Entidades / migrações propostas

Todas as novas tabelas usam prefixo `holding_`. Usar UUID, chaves estrangeiras, `bigint` para centavos, `date` para datas de negócio e `timestamptz` para auditoria. Restrições de soma/participação e integridade entre CNPJs devem ser aplicadas em funções transacionais, com bloqueio de linhas.

| Migração       | Tabelas                                                                                                                          | Restrições principais                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 acesso     | `holding_memberships`, `holding_permissions`, `holding_person_user_links`                                                        | auth.users separado de pessoa; autorização explícita no app; papéis/ações/projetos, único vínculo pessoa/usuário ativo                                                                            |
| 002 empresas   | `holding_companies`, `holding_projects`, `holding_accounts`, `holding_reserves`                                                  | CNPJ normalizado único quando preenchido; projeto/conta/reserva com empresa; abertura bancária distinta da atribuição                                                                             |
| 003 cadastros  | `holding_people`, `holding_contracts`, `holding_contract_versions`, `holding_attachments`, `holding_categories`                  | CPF/RG privados; versão do vínculo, vigência, empresa/projeto compatíveis; arquivos em bucket privado                                                                                             |
| 004 financeiro | `holding_entries`, `holding_recurrences`, `holding_allocations`, `holding_settlements`, `holding_settlement_allocations`         | montantes positivos; rateios fecham em centavos; conta e lançamento da mesma empresa; saldo de baixa não negativo; `reversal_of` único; recorrência+competência únicos; vínculo+competência único |
| 005 movimentos | `holding_transfers`, `holding_transfer_legs`, `holding_project_reallocations`, `holding_partner_movements`                       | transferência com duas pontas atômicas/natureza; repasse mesmo CNPJ; devolução vinculada ao adiantamento original e limitada ao saldo                                                             |
| 006 societário | `holding_compositions`, `holding_composition_shares`, `holding_closings`, `holding_closing_allocations`, `holding_distributions` | composição 10.000 pontos-base por vigência sem sobreposição; snapshot imutável no fechamento; aprovado/apurado/pago distintos                                                                     |
| 007 pessoal    | `holding_personal_accounts`, `holding_personal_categories`, `holding_personal_sources`, `holding_personal_entries`               | `owner_user_id` obrigatório em tudo; FK composta para impedir categoria/fonte/conta de outro titular; settlement_id único por baixa vinculada                                                     |
| 008 controle   | `holding_audit_events`, `holding_import_events`                                                                                  | auditoria somente append; origem+conta+external_id únicos para importação                                                                                                                         |

As tabelas de movimentos financeiros precisam de `company_id`, inclusive baixas, reservas, impostos (entries) e fechamentos. Usar chaves estrangeiras compostas `(id, company_id)` onde necessário. A marca Grupo C&R não é um CNPJ adicional. Movimentos entre empresas preservam ambas as empresas/natureza e são eliminados do consolidado gerencial, mantendo passivos/ativos na contabilidade por empresa.

## Autorização e dados pessoais

1. Substituir escolha de usuário por Supabase Auth com convites e recuperação de senha. Não converter usuários de outros sistemas em administradores automaticamente. Conceder membership específica do grupo a Rafael e Claudecir após identificação real.
2. Validar a sessão e membership no servidor em cada operação; menus/layout não são fronteira de segurança. Implementar permissões por ação/projeto (leitura, criação, baixa, estorno, conciliação, aprovação, reabertura, administração).
3. Habilitar RLS empresarial por membership/permissão e empresa/projeto. Storage privado com URLs temporárias e políticas por vínculo/empresa. Validar conteúdo/tamanho e verificar arquivos antes do armazenamento real.
4. Nas quatro tabelas pessoais, `USING (owner_user_id = auth.uid())` e `WITH CHECK (owner_user_id = auth.uid())`. **Não criar exceção para administradores empresariais**. Operações do servidor devem usar cliente por sessão para leitura/edição pessoal. Service role nunca no navegador nem em operações gerais de leitura pessoal.
5. A baixa e a entrada pessoal correspondente devem ser gravadas na mesma transação por função restrita, com titular resolvido pelo vínculo pessoa/usuário. Usar `settlement_id` único; reprocessamento faz `ON CONFLICT DO NOTHING`. Estorno é outro settlement ligado à origem e gera evento pessoal inverso, sem apagar histórico. A função privilegiada deve ter `search_path` fixo, permissões mínimas e não retornar dados pessoais ao pagador.
6. Validar via HTTP e SQL/RLS que Rafael não consulta/edita categoria, fonte, conta ou lançamento de Claudecir e vice-versa, mesmo quando admin empresarial e usando IDs conhecidos. Validar INSERT/UPDATE de owner e todas as FKs.
7. Registrar antes/depois, autor e horário de baixas, estornos, participações, aprovação/reabertura e alterações de vínculo. Revisões de fechamento devem referenciar a versão anterior; preservar composição e documentos.

## Troca do adaptador

Preservar funções de cálculo puro e testes. Trocar `transaction` e arquivo por repositórios SQL, com unidade transacional para cada comando. Migrar os DTOs para validação estrutural rigorosa de entrada, idempotency keys em comandos e controle de concorrência no banco. A fila JSON local só vale para um processo e dados fictícios. Não importar automaticamente o seed, documentos ou CNPJs fictícios para produção. Remover endpoint reset e sessão de demonstração da implantação real.

## Entrada futura via n8n

Propor `POST /api/integrations/movements` (não implementado nesta etapa): autenticação de serviço com escopo por origem/conta, TLS, assinatura HMAC com timestamp/nonce, proteção contra replay e limite de requisições. Payload: `source`, `external_id`, `account_id`, `occurred_on`, `amount_cents`, `direction`, `description`, `counterparty_reference`. Nunca enviar dados pessoais desnecessários.

Chave única `(source, account_id, external_id)`. Importação não cria receita por padrão: registra evento e tenta vincular uma pendência existente somente com correspondência segura (empresa, conta, valor, referência, período e contraparte). Divergência, múltiplas correspondências, parcialidade e transferência vão para revisão manual. Registrar decisão e origem. Efetivar baixa exatamente uma vez na mesma transação. A escolha do banco, autenticação bancária e critérios finais de correspondência permanecem pendentes.

## Decisões necessárias

Formalizar reservas/cobertura, compensação de prejuízos, retenção por projeto, aprovação e bloqueio por caixa; autorização de reabertura e períodos travados; classificação contábil de cada movimento entre CNPJs; banco para conciliação automática; política de retenção e documentos; distribuição de ajustes retroativos. As políticas locais são exemplos identificados e não políticas contábeis definitivas.
