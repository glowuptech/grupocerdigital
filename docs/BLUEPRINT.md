# Grupo C&R Digital — Blueprint para o Codex

## Objetivo e sequência

Implemente o Financeiro da Grupo C&R Digital, separado da GlowUp, no repositório GitHub compartilhado. Inspecione a estrutura existente primeiro. Use Next.js com App Router, React e TypeScript. Para um repositório vazio, adote Tailwind CSS e componentes shadcn/ui como base visual.

**Etapa 1 — Codex.** Entregue páginas navegáveis e fluxos funcionais com dados fictícios, persistência local de demonstração e opção de redefinir os dados. Separe as regras financeiras e o acesso a dados da interface. Use valores monetários em centavos e datas de negócio em America/Sao_Paulo. Documente como rodar, validar e substituir a camada demonstrativa.

**Etapa 2 — v0.** Continue no mesmo repositório e conecte o Supabase/PostgreSQL existente. Todas as tabelas novas do financeiro devem começar com `holding_`. Documente o modelo e as migrações propostas nesta etapa inicial. Execute a integração e as migrações somente na etapa do v0, preservando as estruturas dos demais sistemas.

## Acesso

Rafael e **Claudecir** são os dois administradores iniciais, cada um com sua conta. No Codex, implemente login, sessão demonstrativa, saída e proteção de navegação com dados fictícios. No v0, conecte Supabase Auth com convite e recuperação de senha. Exija autorização específica para a Grupo C&R Digital mesmo quando o usuário já existir no Supabase compartilhado. Restrinja rotas, operações, registros e anexos privados com controles no servidor, no banco e no armazenamento. Remova a sessão de demonstração da implantação com dados reais. Mantenha usuário de acesso separado do cadastro de pessoa. Preveja permissões futuras por ação e projeto e registre autor, horário e alteração em ações sensíveis.

## Navegação e interface

Crie Login, Dashboard, Lançamentos, Contas e Conciliação, Fluxo de Caixa, DRE, Projetos, Pessoas, Sócios, Fechamento e Configurações. Disponibilize visões filtradas para salários, impostos e distribuições. Use português do Brasil, BRL, fundo claro, texto escuro e visual fintech responsivo. Use verde para entradas, vermelho para saídas, roxo para saldo e âmbar para pendências, sempre acompanhado de texto. Destaque Novo lançamento.

## Empresas e CNPJs

Grupo C&R Digital é a marca que reúne as empresas. Cadastre cada empresa com razão social, nome fantasia opcional e CNPJ único. Permita cadastrar empresas e projetos em preparação, com indicação de CNPJ pendente. Vincule cada projeto à empresa responsável e permita vários projetos no mesmo CNPJ.

Vincule contas, lançamentos, contratos, impostos, reservas e fechamentos à empresa responsável. Use o projeto para detalhar a operação dentro daquela empresa. Ofereça filtros e visões por empresa/CNPJ, por projeto e por grupo. O consolidado é gerencial e preserva os saldos e as movimentações de cada empresa. Cadastre o administrativo na empresa responsável pelo gasto.

Diferencie transferências entre contas do mesmo CNPJ, alocações internas por projeto e movimentações entre CNPJs distintos. Registre origem, destino e natureza das movimentações entre empresas, vincule as duas pontas e elimine a duplicidade nos totais consolidados. Preserve o impacto nos saldos de cada empresa e mantenha a classificação contábil por natureza explícita.

## Projetos, contas e reservas

Cadastre Realiza, Truco ou Facão, Blog System, Animais Influenciadores e Ray-On. Inclua Administrativo do Grupo, com indicação da empresa responsável. Permita criar, renomear e arquivar projetos sem perder histórico. Cada projeto ganha uma página com saldo atribuído, reserva, caixa livre, recebíveis futuros, próximos pagamentos, lançamentos, fluxo, DRE, equipe e participantes. Preveja data de início, saldo de abertura atribuído e registro de histórico anterior sem duplicar dinheiro.

Separe a conta bancária, carteira ou plataforma de pagamento da atribuição financeira ao projeto e vincule cada conta ao CNPJ responsável. Permita saldos iniciais por conta. Transferências entre contas próprias alteram os saldos dessas contas. Repasses internos alteram os saldos atribuídos aos projetos. Nenhum desses movimentos altera o total consolidado ou gera receita na DRE.

Mostre reserva geral e reservas por projeto, necessidade estimada para 30 dias, quanto já está reservado e quanto falta cobrir. Demonstre pisos manuais configuráveis e explicite o cálculo. Para o caixa livre, deduza as reservas e os compromissos vencidos ou próximos ainda não cobertos por elas. Mostre recebíveis futuros na projeção, separados do saldo atual.

## Lançamentos

Registre tipo, projeto ou administrativo, categoria, título, descrição opcional, valor, competência, vencimento e status. Ao efetivar uma parcela, registre valor, conta e data real. Crie recebimentos e despesas avulsos ou recorrentes com dia mensal e data final. Gere uma ocorrência por mês, sem duplicar nem alterar as parcelas já efetivadas. Despesas novas começam pendentes. Permita baixas parciais, cancelamento de pendências e estornos vinculados. Mostre saldo a pagar ou receber. Ofereça lista geral e filtros por projeto, categoria, tipo, status e período.

Use categorias comuns e subcategorias configuráveis. Exemplos: Realiza, prêmio e documentação; Truco ou Facão, divulgação e licenças; Blog System, servidor, banco de dados e WhatsApp API oficial; Animais Influenciadores, banca, cashback, domínio, configuração de personagens, IA e campanhas de live ou crescimento de perfil; Ray-On, infraestrutura e produção de cursos. Tráfego pago disponível para todos. Separe salários, encargos, benefícios, prestadores, despesas administrativas e impostos.

Permita ratear em reais ou porcentagem entre projetos e administrativo. Valide o total em centavos. Nas baixas parciais, distribua o caixa efetivado entre as parcelas do rateio com regra determinística de arredondamento. O consolidado conta cada movimento uma vez.

Inclua conciliação manual. Para integração futura via n8n, documente entrada autenticada de movimentos com identificador único por origem e conta. Vincule a uma pendência existente quando houver correspondência segura e encaminhe ambiguidades para revisão. A escolha do banco fica para depois.

## Meu Financeiro

No mesmo painel, permita alternar entre Empresas e Meu Financeiro. Cada usuário tem um espaço pessoal privado, com seus próprios lançamentos manuais de entrada e saída, contas, saldo e filtros. Crie uma tela de categorias pessoais configuráveis para receitas e despesas e permita cadastrar fontes externas de recebimento, como a GlowUp para Rafael e as outras empresas de Claudecir. Fontes são identificações do pagador e ficam separadas das empresas e CNPJs do grupo. Exclua todos os movimentos pessoais do caixa e da DRE empresarial.

Ao efetivar um pagamento de empresa do grupo para uma pessoa vinculada a um usuário, registre uma entrada pessoal vinculada a cada baixa efetiva, inclusive parcial. Use a identificação da baixa para garantir uma única entrada mesmo em reprocessamentos. Reflita estornos no histórico pessoal sem apagar a origem. Quem tem acesso empresarial pode ver o pagamento original conforme suas permissões, enquanto apenas o titular pode consultar e editar seus registros pessoais. A automação deve operar no servidor sem conceder leitura pessoal a administradores empresariais.

Na demonstração, simule dois usuários e valide o isolamento de lançamentos, categorias, fontes e saldos. Na etapa do v0, aplique autorização por titular no servidor e políticas RLS no Supabase, inclusive para administradores do app. Valide que Rafael e Claudecir não conseguem consultar os dados pessoais um do outro nem por acesso direto às operações de dados.

## Indicadores e relatórios

**Dashboard.** Mostre saldo atual, caixa livre, total recebido e total pago. Períodos de 1, 3, 6 ou 12 meses alteram totais e gráficos do intervalo. Saldo atual representa a posição de hoje. Compare recebimentos, pagamentos e movimentação líquida por projeto. No gráfico mensal, use verde para entradas, vermelho para saídas e roxo para saldo final. Inclua lucro líquido por competência, salários e encargos pagos, impostos pagos e distribuições pagas por sócio. Abra a lista filtrada a partir dos totais.

**Fluxo de caixa.** Tabela diária do mês atual por padrão, com saldo inicial, entradas efetivadas, saídas efetivadas e saldo final. Inclua dias sem movimento. Separe projeção de recebimentos e pagamentos da tabela realizada.

**DRE gerencial.** Tabela por competência, consolidada e por projeto, com administrativo e rateios identificáveis. Mostre receita bruta, deduções e tributos sobre receita, receita líquida, custos, despesas operacionais e administrativas, resultado financeiro, tributos sobre resultado e lucro líquido. Use lançamentos reconhecidos por competência, inclusive quando pendentes de baixa. Separe previsões ainda não reconhecidas. Cadastre tributos manualmente por tipo, competência, vencimento, valor e status. Classifique saldo de abertura, transferências, aportes, adiantamentos, devoluções e distribuições fora da DRE.

## Pessoas, vínculos e contratos

Uma pessoa pode trabalhar em vários projetos e ser sócia no mesmo cadastro. Guarde nome, CPF e RG no perfil. Por vínculo, registre projeto ou administrativo, CLT ou PJ, CNPJ quando aplicável, início, término ou prazo, valor e dia de pagamento. Anexe contrato e documentos da negociação ao vínculo. Preserve condições anteriores quando houver reajuste ou renovação.

Gere os compromissos mensais por vínculo vigente. Mostre tempo no vínculo, pendências e histórico pago mês a mês, com total por pessoa e por projeto. O mesmo pagamento atualiza o histórico da pessoa e o caixa. Remuneração e distribuição aos sócios têm históricos separados.

## Sócios e fechamento

Configure participações na holding e por projeto, permitindo que o grupo seja participante. Use Rafael e Claudecir com 50% cada como cenário fictício e demonstre um projeto com 90% do grupo e 10% de parceiro. Valide 100% por composição ativa, com vigência e histórico. Preserve a composição usada nos fechamentos anteriores.

Separe lucro apurado, valor aprovado e valor pago. Demonstre o fechamento mensal com conferência de caixa, pendências e rateios. Apure a parcela de cada participante no projeto antes da distribuição do grupo. A parcela interna do grupo não cria nova entrada de caixa. A distribuição só reduz o caixa na data do pagamento. Preserve os fechamentos e registre ajustes ou reaberturas autorizados.

Em Movimentações de Sócios, registre pessoa, valor, data, conta e destino opcional. Use adiantamento reembolsável por padrão, com opção de aporte de capital. Vincule devoluções aos adiantamentos originais. Mostre quanto cada sócio colocou, recebeu de volta, tem a recuperar e recebeu em distribuições. Alterações de participação são explícitas e independentes desses movimentos.

## Decisões em aberto

Use exemplos identificados como demonstração para a compensação de prejuízos entre projetos, a fórmula definitiva das reservas, o bloqueio de distribuições por falta de caixa e as aprovações. Documente as permissões futuras e a dependência do banco para conciliação automática. Não transforme regras de exemplo em políticas definitivas.

## Critérios de aceite no Codex

1. Login demonstrativo e navegação funcionam. Um projeto novo ganha sua própria página.
2. Uma despesa recorrente parcialmente paga mantém o restante pendente. Pagar em outro mês muda o caixa do mês da baixa e preserva a competência na DRE.
3. Duas empresas com CNPJs distintos têm saldos e relatórios próprios. Uma movimentação entre elas aparece vinculada nas duas visões e não infla os totais consolidados.
4. Um rateio fecha em centavos e aparece uma vez no consolidado. Um repasse altera o saldo atribuído sem alterar o consolidado.
5. Uma pessoa com dois vínculos tem pagamentos separados e histórico único. Uma devolução parcial reduz o saldo a recuperar do sócio.
6. Os gráficos e tabelas usam a mesma fonte demonstrativa e os totais conferem. O projeto compila e o README documenta execução, escopo demonstrado e passagem ao v0.
