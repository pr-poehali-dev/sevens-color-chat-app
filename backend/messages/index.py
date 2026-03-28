"""Отправка и получение сообщений в Семицвет Chat"""
import json
import os
import psycopg2


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], options="-c search_path=t_p26039289_sevens_color_chat_ap")


def get_user(cur, token: str):
    cur.execute("SELECT id, username, display_name FROM chat_users WHERE token = %s", (token,))
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    auth = event.get("headers", {}).get("X-Authorization") or event.get("headers", {}).get("Authorization") or ""
    token = auth.replace("Bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, token)
    if not user:
        conn.close()
        return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Не авторизован"})}

    user_id, _, _ = user
    method = event.get("httpMethod")

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        other_user_id = params.get("other_user_id")
        if not other_user_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "other_user_id required"})}

        cur.execute("""
            SELECT id, from_user_id, to_user_id, content, created_at, is_read
            FROM chat_messages
            WHERE (from_user_id = %s AND to_user_id = %s)
               OR (from_user_id = %s AND to_user_id = %s)
            ORDER BY created_at ASC
            LIMIT 200
        """, (user_id, other_user_id, other_user_id, user_id))
        rows = cur.fetchall()

        cur.execute("""
            UPDATE chat_messages SET is_read = TRUE
            WHERE from_user_id = %s AND to_user_id = %s AND is_read = FALSE
        """, (other_user_id, user_id))
        conn.commit()
        conn.close()

        messages = [
            {
                "id": str(r[0]),
                "from_user_id": str(r[1]),
                "to_user_id": str(r[2]),
                "content": r[3],
                "created_at": r[4].isoformat(),
                "is_read": r[5],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"messages": messages})}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        to_user_id = body.get("to_user_id")
        content = (body.get("content") or "").strip()

        if not to_user_id or not content:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заполните все поля"})}

        if len(content) > 4000:
            conn.close()
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Сообщение слишком длинное"})}

        cur.execute(
            "INSERT INTO chat_messages (from_user_id, to_user_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
            (user_id, to_user_id, content)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()

        return {
            "statusCode": 201,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": {
                    "id": str(row[0]),
                    "from_user_id": str(user_id),
                    "to_user_id": str(to_user_id),
                    "content": content,
                    "created_at": row[1].isoformat(),
                    "is_read": False,
                }
            })
        }

    conn.close()
    return {"statusCode": 405, "headers": CORS_HEADERS, "body": json.dumps({"error": "Method not allowed"})}