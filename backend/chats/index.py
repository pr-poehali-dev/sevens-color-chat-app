"""Список чатов пользователя в Семицвет Chat"""
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
    return psycopg2.connect(os.environ["DATABASE_URL"], options="-c search_path=t_p26039289_sevens_color_chat_ap")


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    auth = event.get("headers", {}).get("X-Authorization") or event.get("headers", {}).get("Authorization") or ""
    token = auth.replace("Bearer ", "").strip()

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM chat_users WHERE token = %s", (token,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Не авторизован"})}

    user_id = row[0]

    cur.execute("""
        WITH last_msgs AS (
            SELECT
                CASE WHEN from_user_id = %s THEN to_user_id ELSE from_user_id END AS other_id,
                content,
                created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY CASE WHEN from_user_id = %s THEN to_user_id ELSE from_user_id END
                    ORDER BY created_at DESC
                ) AS rn
            FROM chat_messages
            WHERE from_user_id = %s OR to_user_id = %s
        ),
        unread AS (
            SELECT from_user_id AS other_id, COUNT(*) AS cnt
            FROM chat_messages
            WHERE to_user_id = %s AND is_read = FALSE
            GROUP BY from_user_id
        )
        SELECT
            u.id, u.username, u.display_name,
            lm.content, lm.created_at,
            COALESCE(unread.cnt, 0) AS unread_count
        FROM (SELECT * FROM last_msgs WHERE rn = 1) lm
        JOIN chat_users u ON u.id = lm.other_id
        LEFT JOIN unread ON unread.other_id = lm.other_id
        ORDER BY lm.created_at DESC
    """, (user_id, user_id, user_id, user_id, user_id))

    rows = cur.fetchall()
    conn.close()

    chats = [
        {
            "user_id": str(r[0]),
            "username": r[1],
            "display_name": r[2],
            "last_message": r[3],
            "last_message_at": r[4].isoformat() if r[4] else "",
            "unread_count": int(r[5]),
        }
        for r in rows
    ]

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"chats": chats})}