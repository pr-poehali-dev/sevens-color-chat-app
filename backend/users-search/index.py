"""Поиск пользователей по юзернейму в Семицвет Chat"""
import json
import os
import psycopg2


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    auth = event.get("headers", {}).get("X-Authorization") or event.get("headers", {}).get("Authorization") or ""
    token = auth.replace("Bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM chat_users WHERE token = %s", (token,))
    if not cur.fetchone():
        conn.close()
        return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Не авторизован"})}

    params = event.get("queryStringParameters") or {}
    q = (params.get("q") or "").strip().lower()

    if not q or len(q) < 2:
        conn.close()
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"users": []})}

    cur.execute("""
        SELECT id, username, display_name
        FROM chat_users
        WHERE username LIKE %s OR LOWER(display_name) LIKE %s
        LIMIT 20
    """, (f"%{q}%", f"%{q}%"))

    rows = cur.fetchall()
    conn.close()

    users = [{"id": str(r[0]), "username": r[1], "display_name": r[2]} for r in rows]
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"users": users})}
