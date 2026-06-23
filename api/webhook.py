import sys
import os
import json
import asyncio
import traceback

# Add telegram-bot folder to sys.path so we can import from it
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'telegram-bot'))

# Import bot and dispatcher
try:
    from main import dp, bot
    from aiogram.types import Update
    IMPORT_OK = True
    IMPORT_ERROR = None
except Exception as e:
    IMPORT_OK = False
    IMPORT_ERROR = traceback.format_exc()

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

    # If imports failed, return error info
    if not IMPORT_OK:
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [[b'content-type', b'text/plain; charset=utf-8']]
        })
        await send({
            'type': 'http.response.body',
            'body': f"IMPORT ERROR:\n{IMPORT_ERROR}".encode('utf-8'),
        })
        return

    if method == 'POST':
        try:
            body = await read_body(receive)
            update_data = json.loads(body.decode('utf-8'))
            
            # Parse Telegram Update
            update = Update.model_validate(update_data, context={"bot": bot})
            
            # Feed update to aiogram dispatcher
            await dp.feed_update(bot, update)
            
            # Return 200 OK to Telegram
            await send({
                'type': 'http.response.start',
                'status': 200,
                'headers': [[b'content-type', b'text/plain']]
            })
            await send({
                'type': 'http.response.body',
                'body': b"OK",
            })
        except Exception as e:
            err_text = traceback.format_exc()
            print(f"Error handling webhook update:\n{err_text}")
            await send({
                'type': 'http.response.start',
                'status': 200,  # Return 200 so Vercel doesn't intercept
                'headers': [[b'content-type', b'text/plain; charset=utf-8']]
            })
            await send({
                'type': 'http.response.body',
                'body': f"ERROR:\n{err_text}".encode('utf-8'),
            })
    else:
        # GET request - verify endpoint is active
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [[b'content-type', b'text/plain']]
        })
        await send({
            'type': 'http.response.body',
            'body': b"Telegram Bot Webhook is active.",
        })
