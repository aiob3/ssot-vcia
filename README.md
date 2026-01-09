# SSOT (template)

Este repositório é um **template** de governança para sessões "agentic" com **SSOT-first** e **HITL**.

```xml
<SSOT_INIT_PARAMS>
  <ORIGEM>Este repositório foi inicializado a partir deste template.</ORIGEM>
  <INTENCAO_IMUTABILIDADE>Usar este bloco como âncora de calibração (curto e estável) para preservar a referência relativa destas instruções.</INTENCAO_IMUTABILIDADE>
  <EDICAO>O operador pode ajustar este bloco quando necessário; registre a decisão no runbook.json (HITL) para rastreabilidade.</EDICAO>
  <REGRA_AGENTE>Só corrigir/editar/complementar este bloco mediante solicitação explícita do operador.</REGRA_AGENTE>
  <ITERACAO>Se houver dúvida, volte ao SSOT (./.github/copilot-instructions.md) e itere recursivamente.</ITERACAO>
</SSOT_INIT_PARAMS>
```

---

## Self-assessment (Acceptance tests)
These tests are designed to reduce ambiguity and validate that `<SSOT_INIT_PARAMS>` remains useful for both humans and agents (including smaller/cheaper models).

- **AT-1: Parseability (MUST PASS)**: The README MUST contain exactly one fenced code block labeled `xml` with exactly one `<SSOT_INIT_PARAMS>...</SSOT_INIT_PARAMS>` root, and MUST include all required tags: `<ORIGEM>`, `<INTENCAO_IMUTABILIDADE>`, `<EDICAO>`, `<REGRA_AGENTE>`, `<ITERACAO>`.
- **AT-2: Change governance (MUST PASS)**: Any change to the XML block MUST be recorded in `runbook.json` under `decisions` with: `id`, `scope:"SSOT_INIT_PARAMS"`, `change_summary`, `reason`, `approved_by`, `timestamp`, `atomic_unit`, `idempotency_note`.
- **AT-3: Non-interference (MUST PASS)**: The XML block MUST NOT alter the rendered structure of the README (headings, lists, links); the rest of the README MUST remain readable and consistent.
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

Rodar localmente:
1. API (leitura/escrita idempotente/atômica):
   - `python3 panel/server.py`  (http://127.0.0.1:8787)
2. UI (estático):
   - `python3 -m http.server 5500 --directory panel` (http://127.0.0.1:5500)

## Como (re)carregar skills no Copilot CLI
- `/skills reload`
- Se necessário: `/skills add ./.github/skills`
