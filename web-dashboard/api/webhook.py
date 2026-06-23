import sys
import os
from http.server import BaseHTTPRequestHandler
import json
import asyncio
from aiogram import types

# Add bot directory to sys.path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'bot'))

from main import dp, bot

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            update_dict = json.loads(post_data.decode('utf-8'))
            update = types.Update(**update_dict)
            
            # Feed update to the dispatcher
            asyncio.run(dp.feed_update(bot, update))
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode('utf-8'))
        except Exception as e:
            print(f"Error processing webhook: {e}")
            self.send_response(500)
            self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Telegram webhook is active!")
