"""
중앙서버 연결이 끊겼을 때 이벤트를 로컬 SQLite에 쌓아두고,
재연결되면 순서대로 재전송하는 큐.

TODO (Claude Code에서 이어서 구현):
- init_db(): events 테이블 생성 (id, payload_json, created_at, sent boolean)
- enqueue(event: dict): 이벤트 삽입
- flush(central_api_url, api_key): sent=False 인 이벤트를 오래된 순으로 전송 시도,
  성공 시 sent=True 마킹. 실패하면 즉시 중단하고 다음 주기에 재시도.
- 주기적으로(RETRY_INTERVAL_SEC) flush()를 호출하는 백그라운드 루프
"""
