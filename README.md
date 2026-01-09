# ssot (template)

Este repositório é um **template** de governança para sessões "agentic" com **SSOT-first** e **HITL**.

## O que é SSOT aqui
- Instruções do agente (SSOT): `./copilot-agentinstruction.md`
- Instruções auxiliares do repo: `./.github/copilot-instructions.md`
- Skills do projeto: `./.github/skills/<skill>/SKILL.md`

## Workflow ao iniciar uma nova sessão
1. **VALIDAR**: ler o SSOT e inventariar artefatos (sem alterar estado).
2. Criar/atualizar artefatos de rastreabilidade:
   - `runbook.json`
   - `project-panel.json`
3. Se houver desvio do SSOT ou necessidade de ação extra, abrir **decisão HITL** e solicitar aprovação.
4. Só então **MODIFICAR**, registrando evidências.

## Como (re)carregar skills no Copilot CLI
- `/skills reload`
- Se necessário: `/skills add ./.github/skills`
