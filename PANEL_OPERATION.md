# Guia de Operação do Painel SSOT VCIA

## Início Rápido

### Passo 1: Iniciar API Server
Abra um terminal PowerShell e execute:

```powershell
cd "H:\Meu Drive\01_PROJECTS\ssot-vcia\ssot-vcia"
python panel/server.py
```

**Aguarde a mensagem:**
```
SSOT panel API running on http://127.0.0.1:8787
```

**⚠️ IMPORTANTE:** Mantenha este terminal aberto. Não feche enquanto estiver usando o painel.

### Passo 2: Iniciar UI Server
Abra um **SEGUNDO terminal** PowerShell e execute:

```powershell
cd "H:\Meu Drive\01_PROJECTS\ssot-vcia\ssot-vcia"
python -m http.server 5500 --directory panel
```

**Aguarde a mensagem:**
```
Serving HTTP on 0.0.0.0 port 5500 (http://0.0.0.0:5500/) ...
```

**⚠️ IMPORTANTE:** Mantenha este terminal aberto também.

### Passo 3: Acessar o Painel
1. Abra seu navegador (Chrome, Edge, Firefox, etc.)
2. Digite na barra de endereços: `http://127.0.0.1:5500`
3. Pressione Enter

### Passo 4: Verificar Conexão
No canto superior direito do painel, você deve ver:
- **Status:** `connected` (em verde) ✅

Se aparecer `disconnected` (em vermelho):
- Verifique se ambos os terminais estão rodando
- Verifique se não há erros nos terminais
- Recarregue a página (F5)

## Homologação das Funcionalidades

### ✅ Verificar Visualização de Dados

#### 1. Project Panel
- Clique em **"Project Panel (project-panel.json) — feed do agente"** para expandir
- Você deve ver:
  - JSON raw completo do arquivo
  - Este JSON representa o **andamento publicado pelo agente para o humano**

#### 2. Runbook
- Clique em **"Runbook (runbook.json) — feed técnico (read-only)"** para expandir
- Você deve ver:
  - JSON raw completo do arquivo
  - Este JSON representa a base técnica (steps/checkpoints/decisions)

#### 3. Runbook Steps/Checkpoints
- Clique em **"Runbook Steps/Checkpoints — ações do agente"** para expandir
- Você deve ver:
  - Steps renderizados (runbook.json.steps)
  - Checkpoints renderizados (runbook.json.checkpoints)

#### 4. Milestones (incremento do operador)
- Clique em **"Milestones (project-panel.json.milestones) — editar por id"** para expandir
- Você deve ver:
  - Um formulário para **editar milestone por id** (update in-place)
  - Uma lista de milestones renderizados (cards) com:
  - Status (ex: "done")
  - Data
  - ID do milestone
  - Resumo
  - Evidência (se houver)

**Teste:** Se houver milestones no `project-panel.json`, eles devem aparecer formatados.

#### 5. Decisions (incremento do operador)
- Clique em **"Decisions (runbook.json.decisions) — incrementos do operador"** para expandir
- Você deve ver cards com:
  - Scope
  - Timestamp
  - ID da decisão
  - Aprovado por
  - Detalhes da mudança, razão, unidade atômica e nota de idempotência

**Teste:** Se houver decisions no `runbook.json`, elas devem aparecer formatadas.

#### 6. Decisions Pending (fila)
- Clique em **"Decisions Pending (project-panel.json.decisions_pending) — fila de atenção"** para expandir
- Se não houver pendências, você verá: "No pending decisions"
- Se houver, você verá cards com os detalhes

### ✅ Testar Adição de Operator Notes

1. Expanda a seção **"Operator Notes (HITL) — incrementos do operador"**
2. Preencha o formulário:
   - **Priority:** Selecione P1, P2 ou P3
   - **Scope (optional):** Digite um scope (ex: "SSOT_INIT_PARAMS") ou deixe vazio
   - **Note:** Digite uma mensagem de teste
3. Clique em **"Add note"**
4. A nota deve aparecer na lista abaixo do formulário
5. O JSON raw do Project Panel deve atualizar automaticamente (aguarde 2 segundos ou clique em Refresh)

**Verificação:** Abra o arquivo `project-panel.json` e confirme que a nota foi adicionada em `operator_notes[]`.

### ✅ Testar Edição de Milestone (update in-place por id)

1. Expanda a seção **"Milestones (project-panel.json.milestones) — editar por id"**
2. No campo **id**, selecione um milestone existente (ou digite um id)
3. Altere um campo (ex.: `status` para `in_progress`)
4. Clique em **"Save milestone"**
5. Verifique que:
   - O card do milestone atualizou
   - O JSON raw do Project Panel atualizou
6. Abra `project-panel.json` e confirme que o milestone foi atualizado **no mesmo registro** (mesmo `id`)

### ✅ Testar Adição de Decision

1. Expanda a seção **"Decisions (runbook.json.decisions) — incrementos do operador"**
2. Preencha todos os campos obrigatórios:
   - **id:** DEC-20260109-1200-TESTE
   - **scope:** SSOT_INIT_PARAMS
   - **change_summary:** Teste de homologação
   - **reason:** Validar funcionalidade do painel
   - **atomic_unit:** Adição de decision de teste
   - **idempotency_note:** Operação idempotente, pode ser repetida
   - **approved_by:** operator
   - **timestamp:** 2026-01-09T12:00:00Z
3. Clique em **"Append decision"**
4. A decision deve aparecer na seção "Decisions" (expanda para ver)
5. O JSON raw do Runbook deve atualizar automaticamente

**Verificação:** Abra o arquivo `runbook.json` e confirme que a decision foi adicionada em `decisions[]`.

### ✅ Testar Atualização Automática

1. Com o painel aberto, edite manualmente o arquivo `project-panel.json` (adicione uma nota diretamente no arquivo)
2. Salve o arquivo
3. Aguarde até 2 segundos
4. O painel deve atualizar automaticamente e mostrar a nova nota

**Alternativa:** Clique no botão **"Refresh"** para atualização manual imediata.

### ✅ Testar Toggle de Accordions

1. Clique no botão **"Toggle all accordions"**
2. Todas as seções devem expandir ou colapsar simultaneamente

## Checklist de Homologação

- [ ] API Server inicia sem erros na porta 8787
- [ ] UI Server inicia sem erros na porta 5500
- [ ] Painel carrega em http://127.0.0.1:5500
- [ ] Status mostra "connected" (verde)
- [ ] Project Panel mostra JSON raw + Milestones renderizados
- [ ] Runbook mostra JSON raw + Decisions renderizados
- [ ] Milestones são exibidos em formato legível (se existirem)
- [ ] Decisions são exibidas em formato legível (se existirem)
- [ ] Decisions Pending mostra "No pending decisions" ou lista (se houver)
- [ ] Operator Notes: formulário funciona e adiciona notas
- [ ] Decisions: formulário funciona e adiciona decisions
- [ ] Atualização automática funciona (polling a cada 2s)
- [ ] Botão Refresh funciona
- [ ] Toggle all accordions funciona
- [ ] Dados são persistidos corretamente nos arquivos JSON

## Encerrando o Servidor

Para parar os servidores:
1. Nos terminais onde estão rodando, pressione **Ctrl+C**
2. Confirme a interrupção se solicitado
3. Os servidores serão encerrados

## Troubleshooting

### Erro: "Port already in use"
**Solução:** A porta está ocupada. Use outra porta:
- Para API: `$env:SSOT_PANEL_PORT="8788"` antes de rodar `python panel/server.py`
- Para UI: `python -m http.server 5501 --directory panel` (e acesse http://127.0.0.1:5501)

### Erro: "ModuleNotFoundError: No module named 'http.server'"
**Solução:** Você está usando Python 2. Use Python 3:
- `python3 panel/server.py`
- `python3 -m http.server 5500 --directory panel`

### Painel não atualiza automaticamente
**Solução:** 
- Verifique se o polling está ativo (deve atualizar a cada 2s)
- Use o botão Refresh manualmente
- Verifique o console do navegador (F12) para erros JavaScript

### Dados não aparecem após adicionar
**Solução:**
- Verifique se a API está rodando (Terminal 1)
- Verifique se não há erros no console do navegador (F12)
- Aguarde 2 segundos para atualização automática
- Clique em Refresh manualmente

## Estrutura de Arquivos

```
ssot-vcia/
├── panel/
│   ├── server.py      # API Server (porta 8787)
│   ├── index.html     # Interface do painel
│   ├── app.js         # Lógica JavaScript
│   └── style.css      # Estilos
├── project-panel.json # Dados do painel (editado via API)
├── runbook.json       # Runbook técnico (editado via API)
└── README.md          # Documentação principal
```

## Fluxo de Dados

```
Navegador (5500) 
    ↓ HTTP GET/POST
API Server (8787)
    ↓ Leitura/Escrita
Arquivos JSON (project-panel.json, runbook.json)
    ↓ Atualização
Navegador (exibe dados atualizados)
```
