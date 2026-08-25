"""
중앙서버 연결이 끊겼을 때 이벤트를 로컬 SQLite에 쌓아두고,
재연결되면 순서대로 재전송하는 큐.
"""

import json
import sqlite3

import requests


def _connect(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path):
    conn = _connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                sent INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def enqueue(db_path, event: dict):
    conn = _connect(db_path)
    try:
        conn.execute(
            "INSERT INTO events (payload_json) VALUES (?)",
            (json.dumps(event, ensure_ascii=False),),
        )
        conn.commit()
    finally:
        conn.close()


def flush(db_path, central_api_url, api_key):
    """
    sent=0 인 이벤트를 오래된 순으로 모아 한 번에 전송한다.
    성공(2xx)하면 전송한 행을 모두 sent=1로 마킹하고 전송 건수를 반환한다.
    실패하면 그 자리에서 중단한다(행은 sent=0으로 남아 다음 주기에 재시도됨) — 0을 반환한다.
    """
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT id, payload_json FROM events WHERE sent = 0 ORDER BY created_at ASC, id ASC"
        ).fetchall()

        if not rows:
            return 0

        events = [json.loads(row["payload_json"]) for row in rows]

        try:
            response = requests.post(
                f"{central_api_url}/api/ingest/events",
                json={"events": events},
                headers={"X-Bridge-Api-Key": api_key},
                timeout=10,
            )
        except requests.RequestException:
            return 0

        if not response.ok:
            return 0

        ids = [row["id"] for row in rows]
        placeholders = ", ".join("?" for _ in ids)
        conn.execute(f"UPDATE events SET sent = 1 WHERE id IN ({placeholders})", ids)
        conn.commit()
        return len(ids)
    finally:
        conn.close()
