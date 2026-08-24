import os
from dotenv import load_dotenv

load_dotenv()

CONCENTRATOR_ID = os.environ["CONCENTRATOR_ID"]
CENTRAL_API_URL = os.environ["CENTRAL_API_URL"]
BRIDGE_API_KEY = os.environ["BRIDGE_API_KEY"]

SERIAL_PORT = os.environ["SERIAL_PORT"]
BAUD_RATE = int(os.environ.get("BAUD_RATE", "19200"))

LOCAL_QUEUE_DB = os.environ.get("LOCAL_QUEUE_DB", "./local_queue.sqlite3")
RETRY_INTERVAL_SEC = int(os.environ.get("RETRY_INTERVAL_SEC", "10"))

# 필수 값 검증 - 하나라도 비어있으면 브리지를 기동하지 않는다
for name, value in [
    ("CONCENTRATOR_ID", CONCENTRATOR_ID),
    ("CENTRAL_API_URL", CENTRAL_API_URL),
    ("BRIDGE_API_KEY", BRIDGE_API_KEY),
    ("SERIAL_PORT", SERIAL_PORT),
]:
    if not value:
        raise RuntimeError(f".env에 {name} 값이 비어있습니다.")
