import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# Initialize Supabase client
# supabase: Client = create_client(url, key)

async def check_user_registered(telegram_id: str) -> bool:
    # TODO: Implement actual Supabase check
    # response = supabase.table("users").select("*").eq("telegram_id", telegram_id).execute()
    # return len(response.data) > 0
    
    # Mocking for now: allow a specific ID or return True for testing
    return True

async def get_user_data(telegram_id: str) -> dict:
    # TODO: Implement actual Supabase fetch
    return {"nama": "User Test", "status": "USER"}
