# Grupo C&R Digital · Financeiro

Etapa 1 do blueprint atualizado: aplicação demonstrativa em Next.js App Router, React, TypeScript, Tailwind CSS e base de componentes shadcn/ui (Button com Radix Slot, CVA e tokens). Toda a operação usa dados fictícios. Rafael e Claudecir são administradores demonstrativos; usuário de acesso e pessoa são entidades distintas.

## Executar

Requisitos: Node.js 22+ (validado com 24.22.1), npm 11, diretório gravável para `.demo/`.

```sh
npm ci
npm run dev
```

Abra o servidor de desenvolvimento pela interface de acesso a aplicações do seu ambiente ou pelo navegador local. Selecione Rafael ou Claudecir em Login; não há senha real. `npm run build` e `npm start` executam a versão de produção demonstrativa. A sessão expira em 24 horas e ao reiniciar o processo. Use o checkout existente; cada tarefa cloud já é isolada e não precisa de worktree.

```sh
npm test
npm run typecheck
npm run build
# Com o servidor em execução e Chromium instalado:
npm run test:browser
```

O teste de navegador usa `BASE_URL` (padrão `http://localhost:3000`) e `CHROMIUM_PATH` (padrão `/usr/bin/chromium`). Ele cria dados fictícios para validar os fluxos. Execute em uma instância de teste. Alternativa: `npx playwright install chromium` e `CHROMIUM_PATH` vazio para o navegador gerenciado do Playwright.

## O que está implementado

- Login, sessão HTTP-only assinada, saída, proteção das páginas e operações no servidor.
- Dashboard com período de 1/3/6/12 meses, filtros por empresa/projeto, gráfico e totais da mesma fonte, reservas, pendências, salários, impostos e distribuições.
- Empresas com CNPJ único ou pendente; contas com abertura; projetos com página própria, edição, arquivamento e saldo atribuído sem duplicar dinheiro.
- Lançamentos avulsos/recorrentes, reconhecimento ou previsão, competência, vencimento, categorias/subcategorias, baixas parciais, cancelamento de pendência sem baixa e estornos vinculados. Para cancelar um lançamento já parcialmente pago, estorne antes as baixas.
- Rateios em reais/porcentagens entre dois destinos no formulário (motor aceita vários); centavos distribuídos por maiores restos, empate pela ordem dos destinos. Nas baixas seguintes usa o saldo de cada parcela, com estorno das parcelas originais.
- Transferências próprias e entre CNPJs, com natureza explícita e duas pontas vinculadas. Repasses de atribuição entre projetos do mesmo CNPJ. Ambos fora da DRE e dos totais de recebimentos/pagamentos consolidados.
- Fluxo diário com dias sem movimento e projeção separada; DRE por competência com previsões separadas. Tributos cadastrados como lançamentos manuais com categoria Impostos e classificação correspondente.
- Pessoas, vários vínculos CLT/PJ, reajustes com histórico, geração mensal idempotente de compromissos e anexos fictícios PDF/TXT de até 500 KB.
- Participações com vigência/100%, cenário 50/50 e 90/10, fechamento por empresa, snapshot de composições, aprovação separada de pagamento e reabertura auditada.
- Adiantamentos reembolsáveis, aportes e devoluções vinculadas sem alterar participação. Composição editável com dois participantes na tela; modelo suporta múltiplos.
- Meu Financeiro privado por titular: contas, lançamentos editáveis, categorias, fontes externas e filtros. Cada baixa empresarial para pessoa vinculada gera uma entrada pessoal idempotente; estorno gera saída vinculada. Registros pessoais nunca entram no caixa ou DRE empresarial.

## Persistência e separação de responsabilidades

`src/lib/model.ts` define as entidades; `finance.ts` contém cálculos puros; `operations.ts` contém regras; `commands.ts` valida operações empresariais; `personal.ts` isola operações pessoais. As rotas `src/app/api/` obtêm o titular da sessão; ignoram qualquer titular enviado pelo cliente. A interface não recebe o conjunto de dados pessoais dos dois usuários. `repository.ts` persiste JSON em `.demo/data.json`, com fila de escrita e troca atômica de arquivo em um único processo Node. Arquivo e anexos são ignorados pelo Git. Os saldos são derivados, não editados à parte.

A sessão demonstrativa permite escolher qualquer um dos dois usuários no Login: seu objetivo é testar a separação por sessão, não autenticar uma identidade real. Não implante com dados reais. O arquivo JSON não atende múltiplas réplicas, serverless, backup, criptografia, políticas bancárias ou produção. Não foi conectado nenhum serviço externo.

Redefinição empresarial em Configurações restaura a base corporativa; não apaga dados privados de outros titulares. Cada titular tem redefinição separada no Meu Financeiro. As baixas vinculadas são reconstruídas idempotentemente. Para uma demonstração inteiramente nova, pare o servidor e remova `.demo/` (somente dados fictícios). Reiniciar o servidor preserva dados locais e encerra as sessões.

Datas de negócio são strings `YYYY-MM-DD`; hoje e horários exibidos usam America/Sao_Paulo. Valores monetários são inteiros em centavos; percentuais de participação são pontos-base. A data mensal é limitada ao último dia do mês. Lançamentos recorrentes geram até a data final, sem sobrescrever ocorrências/baixas existentes. Saldos atuais excluem baixas futuras.

## Regras provisórias

Reservas são pisos manuais. Caixa livre = saldo − reservas − max(0, compromissos vencidos ou em 30 dias − reservas), agregado por filtro. Atribuição de reservas não é uma alocação bancária. No fechamento, lucros positivos de cada projeto são distribuídos sem compensar prejuízos; a participação externa é calculada antes da parcela do grupo; a aprovação pode ser inferior ao lucro disponível. O exemplo não bloqueia por falta de caixa. Validações de aprovação e compensação de prejuízos precisam de decisão do negócio.

## Etapa 2 · v0 / Supabase

Leia [o modelo e o plano de integração](docs/ETAPA-2.md) e [a matriz de aceite](docs/ACEITE.md). Substitua o adaptador de arquivo por transações PostgreSQL mantendo regras e contratos das operações. Remova login e sessão de demonstração. Conecte o Supabase existente com autorização específica para o grupo, Auth com convites/recuperação e RLS por titular inclusive para administradores. Todas as tabelas novas propostas começam com `holding_`. Nenhuma migração foi executada nesta etapa.

### Acesso por proxy

O login compara a origem com o endereço público encaminhado em `X-Forwarded-Host` e `X-Forwarded-Proto`. O proxy deve sobrescrever esses cabeçalhos. Opcionalmente, configure `APP_ORIGIN` com a origem pública exata (ex.: `https://financeiro.exemplo.com`) para fixar o endereço autorizado. Cookies usam `Secure` quando esse endereço usa HTTPS.

### Lançamentos simplificados

No cadastro diário, informe tipo, projeto, título, valor, categoria, vencimento e situação. “Já paguei / já recebi” registra o movimento e seu pagamento/recebimento na mesma transação; escolha a conta da empresa e a data real. Para recorrências, deixe pendente e confirme cada ocorrência individualmente. Competência, classificação DRE, vínculos e rateios ficam em “Mais opções”. Na lista, use Recebimentos (verde) e Despesas (vermelho), com “Marcar como recebido/pago” para confirmar valores inclusive parciais. A conferência de extrato é opcional na tela Contas.

### Funcionários, prestadores e sócios

A área **Funcionários e equipe** substitui o rótulo genérico Pessoas. Cadastre uma pessoa e abra **Abrir perfil**: `/pessoas/:id`. A ficha reúne CPF/RG, contato, nascimento, endereço e observações. O cadastro de pessoa não cria credenciais de acesso. Uma pessoa pode ter várias contratações CLT/PJ em empresas/projetos diferentes e também ser sócia; suas distribuições continuam separadas em Sócios.

Em **Adicionar contratação**, registre cargo/função, empresa definida pelo projeto, início/término, salário ou honorários, dia do pagamento, jornada, benefícios e condições. Os documentos PDF/TXT fictícios ficam na própria contratação e podem ser removidos com confirmação. Reajustar/renovar cria uma nova condição sem sobrescrever valores ou documentos antigos. Encerrar guarda data e motivo e impede compromissos posteriores ao término; despesas futuras já geradas devem ser revisadas/canceladas manualmente. A demonstração não calcula encargos, benefícios nem proporcionalidade da folha automaticamente.

**Gerar pagamentos do mês** no perfil gera apenas compromissos vigentes daquela pessoa, sem duplicação. Na lista da equipe, a ação gera para toda a equipe. Cada pagamento confirmado em Lançamentos aparece no perfil e no caixa pela mesma baixa; benefícios descritivos não geram pagamentos separados automaticamente.

### Remover e arquivar cadastros

Configurações oferece remoção com confirmação para empresas, categorias, pisos de reserva e documentos. Empresas/categorias sem uso são excluídas; aquelas com dependências ou histórico são arquivadas e podem ser restauradas. Categorias de salários/prestadores necessárias a contratações vigentes não podem ser removidas antes do encerramento dessas contratações. Empresas e categorias arquivadas saem das opções de novos registros, mas continuam nos relatórios e filtros históricos. Zerar/remover um piso não movimenta dinheiro em conta. Documentos removidos não são recuperáveis pelo botão Restaurar; a ação fica na auditoria.

Perfis sem uso podem ser removidos; perfis com histórico ou usuário vinculado são arquivados após o término dos vínculos vigentes. Arquivar mantém contratos, pagamentos e participações anteriores. Restaurar reabilita o cadastro, sem reabrir contratações encerradas.

Validação adicional: `npm run test:cadastros` com o servidor local em execução testa remoções, perfil próprio, contratação detalhada, anexos, edição, persistência e tela mobile usando dados fictícios.
