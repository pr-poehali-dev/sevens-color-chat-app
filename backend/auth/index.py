"""Регистрация и вход в Семицвет Chat"""
import json
import os
import hashlib
import secrets
import psycopg2


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], options="-c search_path=t_p26039289_sevens_color_chat_ap")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    return secrets.token_hex(32)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("path", "")
    body = json.loads(event.get("body") or "{}")

    conn = get_conn()
    cur = conn.cursor()

    if path.endswith("/register"):
        username = (body.get("username") or "").strip().lower()
        password = body.get("password") or ""
        display_name = (body.get("display_name") or "").strip()

        if not username or not password or not display_name:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "Заполните все поля"})}

        if len(username) < 3:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "Юзернейм слишком короткий"})}

        cur.execute("SELECT id FROM chat_users WHERE username = %s", (username,))
        if cur.fetchone():
            conn.close()
            return {"statusCode": 409, "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "Юзернейм уже занят"})}

        token = generate_token()
        cur.execute(
            "INSERT INTO chat_users (username, password_hash, display_name, token) VALUES (%s, %s, %s, %s) RETURNING id",
            (username, hash_password(password), display_name, token)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        return {
            "statusCode": 201,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "token": token,
                "user": {"id": str(user_id), "username": username, "display_name": display_name}
            })
        }

    if path.endswith("/login"):
        username = (body.get("username") or "").strip().lower()
        password = body.get("password") or ""

        cur.execute(
            "SELECT id, username, display_name FROM chat_users WHERE username = %s AND password_hash = %s",
            (username, hash_password(password))
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 401, "headers": CORS_HEADERS,
                    "body": json.dumps({"error": "Неверный юзернейм или пароль"})}

        token = generate_token()
        cur.execute("UPDATE chat_users SET token = %s WHERE id = %s", (token, row[0]))
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "token": token,
                "user": {"id": str(row[0]), "username": row[1], "display_name": row[2]}
            })
        }

    conn.close()
    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Not found"})}