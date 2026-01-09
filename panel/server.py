#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from datetime import datetime, timezone

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROJECT_PANEL_PATH = os.path.join(REPO_ROOT, "project-panel.json")
RUNBOOK_PATH = os.path.join(REPO_ROOT, "runbook.json")
INIT_PARAMS_PATH = os.path.join(REPO_ROOT, "init-params.xml")


def _read_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json_atomic(path: str, data):
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def _now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _ensure_list(obj, key: str):
    if key not in obj or not isinstance(obj[key], list):
        obj[key] = []


def _require_fields(payload: dict, fields: list[str]):
    missing = [k for k in fields if not str(payload.get(k, "")).strip()]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")


def _idempotent_append_by_id(items: list[dict], item: dict, id_key: str = "id") -> bool:
    """Returns True if appended, False if already existed (idempotent no-op)."""
    item_id = str(item.get(id_key, "")).strip()
    for existing in items:
        if str(existing.get(id_key, "")).strip() == item_id:
            return False
    items.append(item)
    return True


def _validate_atomic_and_idempotent_fields(payload: dict):
    # "Atomicity" and "idempotency" are enforced as required metadata.
    _require_fields(payload, ["atomic_unit", "idempotency_note"])


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, data):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        # CORS: UI is typically served from :5500 and calls API on :8787.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, code: int, text: str):
        body = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        # CORS: allow local UI to call API endpoints.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.end_headers()
        self.wfile.write(body)

    def _read_body_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise ValueError(f"Invalid JSON body: {e}")

    def do_OPTIONS(self):
        # Preflight for CORS
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            # Serve panel UI
            self._send_text(200, "SSOT VCIA panel server. Open /panel/index.html via a static server or use file:// + API on :8787")
            return

        if path == "/api/project-panel":
            self._send_json(200, _read_json(PROJECT_PANEL_PATH))
            return

        if path == "/api/runbook":
            self._send_json(200, _read_json(RUNBOOK_PATH))
            return

        if path == "/api/init-params":
            with open(INIT_PARAMS_PATH, "r", encoding="utf-8") as f:
                xml = f.read()
            body = xml.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/xml; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "content-type")
            self.end_headers()
            self.wfile.write(body)
            return

        self._send_text(404, "Not found")

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            payload = self._read_body_json()

            if path == "/api/project-panel/milestones/upsert":
                # Update milestone by id (in-place). If not found, create it.
                # This is an operator increment over project-panel.json.milestones.
                _require_fields(payload, ["id"])
                allowed_keys = ["status", "summary", "evidence", "date"]
                intervention_id = str(payload.get("intervention_id", "")).strip()

                pp = _read_json(PROJECT_PANEL_PATH)
                _ensure_list(pp, "milestones")

                milestone_id = str(payload["id"]).strip()
                milestone = None
                for m in pp["milestones"]:
                    if str(m.get("id", "")).strip() == milestone_id:
                        milestone = m
                        break

                created = False
                changed = False

                if milestone is None:
                    milestone = {"id": milestone_id}
                    pp["milestones"].append(milestone)
                    created = True
                    changed = True

                # Apply updates (allow clearing values by sending empty strings).
                for k in allowed_keys:
                    if k in payload:
                        new_val = str(payload.get(k, ""))
                        old_val = str(milestone.get(k, ""))
                        if new_val != old_val:
                            milestone[k] = new_val
                            changed = True

                if changed:
                    if intervention_id:
                        milestone["last_intervention_id"] = intervention_id
                        milestone["updated_at"] = _now_iso()
                    _write_json_atomic(PROJECT_PANEL_PATH, pp)

                self._send_json(
                    200,
                    {
                        "status": "ok",
                        "id": milestone_id,
                        "created": created,
                        "changed": changed,
                        "timestamp": _now_iso(),
                    },
                )
                return

            if path == "/api/operator-notes":
                # Atomic append to project-panel.json.operator_notes
                _require_fields(payload, ["id", "priority", "message", "timestamp"])
                pp = _read_json(PROJECT_PANEL_PATH)
                _ensure_list(pp, "operator_notes")

                note = {
                    "id": str(payload["id"]).strip(),
                    "priority": str(payload["priority"]).strip(),
                    "scope": str(payload.get("scope", "")).strip(),
                    "message": str(payload["message"]).strip(),
                    "timestamp": str(payload["timestamp"]).strip(),
                    "intervention_id": str(payload.get("intervention_id", "")).strip(),
                }

                appended = _idempotent_append_by_id(pp["operator_notes"], note)
                if appended:
                    _write_json_atomic(PROJECT_PANEL_PATH, pp)
                self._send_json(200, {"status": "ok", "appended": appended, "timestamp": _now_iso()})
                return

            if path == "/api/runbook/decisions":
                # Atomic + idempotent append by decision id.
                _require_fields(
                    payload,
                    [
                        "id",
                        "scope",
                        "change_summary",
                        "reason",
                        "approved_by",
                        "timestamp",
                    ],
                )
                _validate_atomic_and_idempotent_fields(payload)

                rb = _read_json(RUNBOOK_PATH)
                _ensure_list(rb, "decisions")

                decision = {
                    "id": str(payload["id"]).strip(),
                    "scope": str(payload["scope"]).strip(),
                    "change_summary": str(payload["change_summary"]).strip(),
                    "reason": str(payload["reason"]).strip(),
                    "atomic_unit": str(payload["atomic_unit"]).strip(),
                    "idempotency_note": str(payload["idempotency_note"]).strip(),
                    "approved_by": str(payload["approved_by"]).strip(),
                    "timestamp": str(payload["timestamp"]).strip(),
                    "intervention_id": str(payload.get("intervention_id", "")).strip(),
                }

                appended = _idempotent_append_by_id(rb["decisions"], decision)
                if appended:
                    _write_json_atomic(RUNBOOK_PATH, rb)
                self._send_json(200, {"status": "ok", "appended": appended, "timestamp": _now_iso()})
                return

            if path == "/api/interventions/apply":
                _require_fields(payload, ["intervention_id", "started_at", "ended_at"])
                intervention_id = str(payload["intervention_id"]).strip()
                started_at = str(payload["started_at"]).strip()
                ended_at = str(payload["ended_at"]).strip()
                operator = str(payload.get("operator", "operator")).strip() or "operator"
                ops = payload.get("operations", {}) if isinstance(payload.get("operations", {}), dict) else {}

                pp = _read_json(PROJECT_PANEL_PATH)
                rb = _read_json(RUNBOOK_PATH)
                _ensure_list(pp, "interventions")
                _ensure_list(pp, "operator_notes")
                _ensure_list(pp, "milestones")
                _ensure_list(rb, "decisions")

                if any(str(x.get("id", "")).strip() == intervention_id for x in pp["interventions"]):
                    self._send_json(200, {"status": "ok", "appended": False, "timestamp": _now_iso()})
                    return

                notes = ops.get("operator_notes", []) if isinstance(ops.get("operator_notes", []), list) else []
                decisions = ops.get("decisions", []) if isinstance(ops.get("decisions", []), list) else []
                milestones = ops.get("milestones_upserts", []) if isinstance(ops.get("milestones_upserts", []), list) else []

                notes_appended = 0
                for n in notes:
                    if not isinstance(n, dict):
                        continue
                    _require_fields(n, ["id", "priority", "message", "timestamp"])
                    n = {
                        "id": str(n["id"]).strip(),
                        "priority": str(n["priority"]).strip(),
                        "scope": str(n.get("scope", "")).strip(),
                        "message": str(n["message"]).strip(),
                        "timestamp": str(n["timestamp"]).strip(),
                        "intervention_id": intervention_id,
                    }
                    if _idempotent_append_by_id(pp["operator_notes"], n):
                        notes_appended += 1

                decisions_appended = 0
                for d in decisions:
                    if not isinstance(d, dict):
                        continue
                    _require_fields(
                        d,
                        [
                            "id",
                            "scope",
                            "change_summary",
                            "reason",
                            "approved_by",
                            "timestamp",
                            "atomic_unit",
                            "idempotency_note",
                        ],
                    )
                    _validate_atomic_and_idempotent_fields(d)
                    d = {
                        "id": str(d["id"]).strip(),
                        "scope": str(d["scope"]).strip(),
                        "change_summary": str(d["change_summary"]).strip(),
                        "reason": str(d["reason"]).strip(),
                        "atomic_unit": str(d["atomic_unit"]).strip(),
                        "idempotency_note": str(d["idempotency_note"]).strip(),
                        "approved_by": str(d["approved_by"]).strip(),
                        "timestamp": str(d["timestamp"]).strip(),
                        "intervention_id": intervention_id,
                    }
                    if _idempotent_append_by_id(rb["decisions"], d):
                        decisions_appended += 1

                milestones_changed = 0
                for m in milestones:
                    if not isinstance(m, dict):
                        continue
                    _require_fields(m, ["id"])
                    milestone_id = str(m["id"]).strip()
                    milestone = None
                    for existing in pp["milestones"]:
                        if str(existing.get("id", "")).strip() == milestone_id:
                            milestone = existing
                            break
                    if milestone is None:
                        milestone = {"id": milestone_id}
                        pp["milestones"].append(milestone)

                    changed = False
                    for k in ["status", "summary", "evidence", "date"]:
                        if k in m and str(m.get(k, "")).strip():
                            new_val = str(m.get(k, "")).strip()
                            if str(milestone.get(k, "")).strip() != new_val:
                                milestone[k] = new_val
                                changed = True
                    if changed:
                        milestone["last_intervention_id"] = intervention_id
                        milestone["updated_at"] = ended_at
                        milestones_changed += 1

                _idempotent_append_by_id(
                    pp["interventions"],
                    {
                        "id": intervention_id,
                        "started_at": started_at,
                        "ended_at": ended_at,
                        "operator": operator,
                        "counts": {
                            "notes_appended": notes_appended,
                            "decisions_appended": decisions_appended,
                            "milestones_changed": milestones_changed,
                        },
                    },
                )

                _write_json_atomic(PROJECT_PANEL_PATH, pp)
                _write_json_atomic(RUNBOOK_PATH, rb)
                self._send_json(200, {"status": "ok", "appended": True, "timestamp": _now_iso()})
                return

            self._send_text(404, "Not found")
        except ValueError as e:
            self._send_text(400, str(e))
        except Exception as e:
            self._send_text(500, f"Internal error: {e}")


def main():
    host = os.environ.get("SSOT_PANEL_HOST", "127.0.0.1")
    port = int(os.environ.get("SSOT_PANEL_PORT", "8787"))
    httpd = HTTPServer((host, port), Handler)
    print(f"SSOT panel API running on http://{host}:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
