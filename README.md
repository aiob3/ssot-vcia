# SSOT (template)

Este repositório é um **template** de governança para sessões "agentic" com **SSOT-first** e **HITL**.

## Inicialização persistente (SSOT)
- Âncora de calibração (máquina + humano): `./init-params.xml`
- SSOT operacional do agente: `./.github/copilot-instructions.md`

**Prompt mínimo (para iniciar o protocolo):**
1) Ler `init-params.xml` e `./.github/copilot-instructions.md`.
2) Inventariar artefatos e estado (VALIDAR).
3) Se houver intervenção humana, localizar a última entrada em `project-panel.json.interventions` e reancorar a execução nela (recursivo).

---

## Self-assessment (Acceptance tests)
These tests are designed to reduce ambiguity and validate that `<SSOT_INIT_PARAMS>` remains useful for both humans and agents (including smaller/cheaper models).

- **AT-1: Parseability (MUST PASS)**: `init-params.xml` MUST exist, MUST contain exactly one `<SSOT_INIT_PARAMS>...</SSOT_INIT_PARAMS>` root, and MUST include all required tags: `<ORIGEM>`, `<INTENCAO_IMUTABILIDADE>`, `<EDICAO>`, `<REGRA_AGENTE>`, `<ITERACAO>`.
- **AT-2: Change governance (MUST PASS)**: Any change to the XML block MUST be recorded in `runbook.json` under `decisions` with: `id`, `scope:"SSOT_INIT_PARAMS"`, `change_summary`, `reason`, `approved_by`, `timestamp`, `atomic_unit`, `idempotency_note`.
- **AT-3: Non-interference (MUST PASS)**: The init params MUST NOT break README readability/structure; the README MUST remain readable and consistent.
- **AT-4: Atomicity & Idempotency (MUST PASS)**: Each change to `<SSOT_INIT_PARAMS>` MUST be a single atomic unit of change and MUST be idempotent (re-applying it yields the same state, with no extra side effects).

Reference implementation: `runbook.json` checkpoint `ssot_init_params_acceptance`.

## O que é SSOT aqui
- Instruções do agente (SSOT reconhecido por padrão): `./.github/copilot-instructions.md`
- Skills do projeto: `./.github/skills/<skill>/SKILL.md`
- (Compat) Legado: `./copilot-agentinstruction.md`

## Workflow ao iniciar uma nova sessão
1. **VALIDAR**: ler o SSOT e inventariar artefatos (sem alterar estado).
2. Criar/atualizar artefatos de rastreabilidade:
   - `runbook.json`
   - `project-panel.json`
3. Se houver desvio do SSOT ou necessidade de ação extra, abrir **decisão HITL** e solicitar aprovação.
4. Só então **MODIFICAR**, registrando evidências.

## Painel web local (HITL)
Este repositório inclui um painel local (HTML + JS) com accordion (expand/collapse) para visualizar e **intervir** via GUI (HITL) usando os artefatos JSON.

### Como operar o painel

O painel requer **2 processos simultâneos** rodando em terminais separados:

#### Terminal 1: API Server
```powershell
# Navegar para o diretório do projeto
cd "H:\Meu Drive\01_PROJECTS\ssot-vcia\ssot-vcia"

# Iniciar o servidor API
python panel/server.py
```

**Resultado esperado:**
```
SSOT panel API running on http://127.0.0.1:8787
```

**Mantenha este terminal aberto.** O servidor ficará rodando e processando requisições.

#### Terminal 2: UI Server (HTTP Server)
```powershell
# Em um NOVO terminal, navegar para o diretório do projeto
cd "H:\Meu Drive\01_PROJECTS\ssot-vcia\ssot-vcia"

# Iniciar o servidor HTTP para servir a UI
python -m http.server 5500 --directory panel
```

**Resultado esperado:**
```
Serving HTTP on 0.0.0.0 port 5500 (http://0.0.0.0:5500/) ...
```

**Mantenha este terminal aberto também.**

#### Acessar o painel
1. Abra seu navegador
2. Acesse: **http://127.0.0.1:5500** ou **http://localhost:5500**
3. O painel carregará automaticamente e mostrará:
   - Status de conexão (deve aparecer "connected" em verde)
   - Project Panel (JSON raw + visualização de Milestones)
   - Runbook (JSON raw + visualização de Decisions)
   - Operator Notes (formulário + lista de notas)
   - Decisions (formulário + lista de decisões)
   - Decisions Pending (lista de decisões pendentes)

### Funcionalidades do painel

**Visualização:**
- **Project Panel**: Mostra `project-panel.json` completo (JSON raw) + Milestones renderizados
- **Runbook**: Mostra `runbook.json` completo (JSON raw) + Decisions renderizados
- **Milestones**: Lista visual de milestones com status, data, resumo e evidências
- **Decisions**: Lista visual de decisões com scope, timestamp, mudanças e razões
- **Decisions Pending**: Lista de decisões que precisam de atenção

**Interação HITL:**
- **Operator Notes**: Adicione notas com prioridade (P1/P2/P3) e scope opcional
- **Add Decision**: Registre decisões HITL com todos os campos obrigatórios (id, scope, change_summary, reason, atomic_unit, idempotency_note, approved_by, timestamp)

**Atualização automática:**
- O painel atualiza automaticamente a cada 2 segundos (polling)
- Use o botão "Refresh" para atualização manual
- Use "Toggle all accordions" para expandir/colapsar todas as seções

### Troubleshooting

**Problema: Status mostra "disconnected"**
- Verifique se o Terminal 1 (API) está rodando na porta 8787
- Verifique se o Terminal 2 (UI) está rodando na porta 5500
- Verifique se não há firewall bloqueando as portas

**Problema: Erro CORS no navegador**
- **NÃO** abra o arquivo HTML diretamente via `file://`
- **SEMPRE** use o servidor HTTP (`python -m http.server 5500 --directory panel`)
- O servidor HTTP é necessário para evitar bloqueios de CORS

**Problema: Porta já em uso**
- Se a porta 8787 estiver ocupada, defina: `$env:SSOT_PANEL_PORT="8788"` (PowerShell)
- Se a porta 5500 estiver ocupada, use outra: `python -m http.server 5501 --directory panel`
- Atualize a URL no navegador para a nova porta

### Notas importantes
- Os dados são salvos **atomicamente** (escrita atômica com arquivo temporário)
- Operações são **idempotentes** (repetir a mesma operação não causa efeitos colaterais)
- Todas as mudanças são registradas nos arquivos JSON (`project-panel.json` e `runbook.json`)
- O painel é **somente leitura** para JSON raw, mas permite **adicionar** notes e decisions via formulários

## Como (re)carregar skills no Copilot CLI
- `/skills reload`
- Se necessário: `/skills add ./.github/skills`
