import sys
import os
import json
import asyncio

# Tambahkan folder telegram_bot ke sys.path agar dapat di-import
bot_dir = os.path.join(os.path.dirname(__file__), 'telegram_bot')
sys.path.append(bot_dir)

from main import dp, bot
from aiogram.types import Update

async def read_body(receive):
    body = b''
    more_body = True
    while more_body:
        message = await receive()
        body += message.get('body', b'')
        more_body = message.get('more_body', False)
    return body

async def app(scope, receive, send):
    if scope['type'] != 'http':
        return

    method = scope.get('method', 'GET')

    if method == 'POST':
        try:
            body = await read_body(receive)
            update_data = json.loads(body.decode('utf-8'))
            
            # Parse Telegram Update
            update = Update.model_validate(update_data, context={"bot": bot})
            
            # Berikan update ke dispatcher aiogram secara asinkron
            await dp.feed_update(bot, update)
            
            # Kirim respon 200 OK ke Telegram
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': [
                    [b'content-type', b'text/plain']
                ]
            })
            await send({
                'type': 'http.response.body',
                'body': b"OK",
            })
        except Exception as e:
            print(f"Error handling webhook update: {str(e)}")
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [
                    [b'content-type', b'text/plain']
                ]
            })
            await send({
                'type': 'http.response.body',
                'body': f"Internal Server Error: {str(e)}".encode('utf-8'),
            })
    else:
        # GET request - Verifikasi endpoint aktif
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [
                [b'content-type', b'text/plain']
            ]
        })
        await send({
            'type': 'http.response.body',
            'body': b"Telegram Bot Webhook inside Next.js project is active.",
        })
