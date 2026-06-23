import sys
import os
import traceback
from http.server import BaseHTTPRequestHandler
import json
import asyncio

try:
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'bot'))
    from aiogram import types
    from main import dp, bot
    INIT_ERROR = None
except Exception as e:
    INIT_ERROR = traceback.format_exc()

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if INIT_ERROR:
                raise Exception(f"Initialization error:\n{INIT_ERROR}")
                
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            update_dict = json.loads(post_data.decode('utf-8'))
            update = types.Update(**update_dict)
            
            asyncio.run(dp.feed_update(bot, update))
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode('utf-8'))
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(f"SERVER ERROR:\n{traceback.format_exc()}".encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        if INIT_ERROR:
            self.wfile.write(f"Error starting up:\n{INIT_ERROR}".encode('utf-8'))
        else:
            self.wfile.write(b"Telegram webhook is active!")
