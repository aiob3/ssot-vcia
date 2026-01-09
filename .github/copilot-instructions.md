---
applyTo: "**"
---

# Instruções do repositório (template)

## SSOT
- Trate como SSOT de instruções: `./copilot-agentinstruction.md`.

## Skills do projeto
- Skills de projeto devem residir em: `./.github/skills/<skill>/SKILL.md`.
- Se o ambiente não descobrir skills automaticamente, usar `/skills reload`.
- Se ainda falhar, registrar manualmente com `/skills add ./.github/skills`.

## Guardrails
- Separar sempre: **VALIDAR (somente leitura)** vs **MODIFICAR (altera estado)**.
- Qualquer ação fora do SSOT exige aprovação explícita do operador (HITL).
