import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
from aiogram.fsm.storage.base import BaseStorage, StorageKey, StateType
import httpx
from supabase import ClientOptions
from typing import Any, Dict, Optional

load_dotenv()

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

# Initialize Supabase client
try:
    supabase: Client = create_client(url, key, options=ClientOptions(http_client=httpx.Client()))
except Exception as e:
    print(f"Supabase init error: {e}")
    supabase = None

async def check_user_registered(telegram_id: str) -> bool:
    def _check():
        response = supabase.table("users").select("*").eq("telegram_id", telegram_id).execute()
        return len(response.data) > 0
    return await asyncio.to_thread(_check)

async def get_user_data(telegram_id: str) -> dict:
    def _get():
        response = supabase.table("users").select("*").eq("telegram_id", telegram_id).execute()
        if response.data:
            return {
                "nama": response.data[0].get("nama_lengkap"),
                "status": response.data[0].get("status"),
                "username": response.data[0].get("username")
            }
        return {}
    return await asyncio.to_thread(_get)

async def register_user(telegram_id: str, username: str, nama_lengkap: str, status: str, password_web: str) -> bool:
    def _register():
        data = {
            "telegram_id": telegram_id,
            "username": username,
            "nama_lengkap": nama_lengkap,
            "status": status,
            "password_web": password_web
        }
        response = supabase.table("users").insert(data).execute()
        return len(response.data) > 0
    return await asyncio.to_thread(_register)

async def db_create_project(nama_mitra: str, nama_user: str, proyek: str, no_kontrak: str, no_po: str, area_lokasi: str, site_operation: str, pelaksana: str) -> dict:
    def _create():
        data = {
            "nama_mitra": nama_mitra,
            "nama_user": nama_user,
            "proyek": proyek,
            "no_kontrak": no_kontrak,
            "nomor_po": no_po,
            "area_lokasi": area_lokasi,
            "site_operation": site_operation,
            "pelaksana": pelaksana
        }
        response = supabase.table("projects").insert(data).execute()
        if response.data:
            return response.data[0]
        return {}
    return await asyncio.to_thread(_create)

async def db_get_projects() -> list:
    def _get():
        response = supabase.table("projects").select("*").order("created_at", desc=True).execute()
        return response.data
    return await asyncio.to_thread(_get)

async def db_get_project_by_id(project_id: str) -> dict:
    def _get():
        response = supabase.table("projects").select("*").eq("id", project_id).execute()
        if response.data:
            return response.data[0]
        return {}
    return await asyncio.to_thread(_get)

async def db_save_progress_report(project_id: str, telegram_id: str, kategori: str, sub_kategori: str, volume_input: float, satuan: str, evidence_files: list) -> bool:
    def _save():
        data = {
            "project_id": project_id,
            "telegram_id": telegram_id,
            "kategori": kategori,
            "sub_kategori": sub_kategori,
            "volume_input": volume_input,
            "satuan": satuan,
            "evidence_files": evidence_files
        }
        response = supabase.table("progress_reports").insert(data).execute()
        return len(response.data) > 0
    return await asyncio.to_thread(_save)

async def db_get_progress_reports(project_id: str, kategori: str = None, sub_kategori: str = None) -> list:
    def _get():
        query = supabase.table("progress_reports").select("*").eq("project_id", project_id)
        if kategori:
            query = query.eq("kategori", kategori)
        if sub_kategori:
            query = query.eq("sub_kategori", sub_kategori)
        response = query.order("reported_at", desc=False).execute()
        return response.data
    return await asyncio.to_thread(_get)

class SupabaseStorage(BaseStorage):
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    def _get_key(self, key: StorageKey) -> str:
        return f"bot:{key.bot_id}:chat:{key.chat_id}:user:{key.user_id}"

    async def set_state(self, key: StorageKey, state: StateType = None) -> None:
        db_key = self._get_key(key)
        state_str = state.state if hasattr(state, "state") else state
        
        def _upsert():
            # Get existing data to keep it
            res = self.supabase.table("bot_fsm_states").select("data").eq("key", db_key).execute()
            existing_data = res.data[0].get("data", {}) if res.data else {}
            
            data = {
                "key": db_key,
                "state": state_str,
                "data": existing_data
            }
            self.supabase.table("bot_fsm_states").upsert(data).execute()
        
        await asyncio.to_thread(_upsert)

    async def get_state(self, key: StorageKey) -> Optional[str]:
        db_key = self._get_key(key)
        
        def _get():
            res = self.supabase.table("bot_fsm_states").select("state").eq("key", db_key).execute()
            if res.data:
                return res.data[0].get("state")
            return None
            
        return await asyncio.to_thread(_get)

    async def set_data(self, key: StorageKey, data: Dict[str, Any]) -> None:
        db_key = self._get_key(key)
        
        def _upsert():
            # Get existing state to keep it
            res = self.supabase.table("bot_fsm_states").select("state").eq("key", db_key).execute()
            existing_state = res.data[0].get("state") if res.data else None
            
            payload = {
                "key": db_key,
                "state": existing_state,
                "data": data
            }
            self.supabase.table("bot_fsm_states").upsert(payload).execute()
            
        await asyncio.to_thread(_upsert)

    async def get_data(self, key: StorageKey) -> Dict[str, Any]:
        db_key = self._get_key(key)
        
        def _get():
            res = self.supabase.table("bot_fsm_states").select("data").eq("key", db_key).execute()
            if res.data:
                return res.data[0].get("data", {})
            return {}
            
        return await asyncio.to_thread(_get)

    async def close(self) -> None:
        pass

