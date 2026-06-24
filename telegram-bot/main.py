import asyncio
import os
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# Set up logging
logging.basicConfig(level=logging.INFO)

# Import database (uses local imports since sys.path is set)
from database import check_user_registered, get_user_data, SupabaseStorage, supabase
from states import Registration

# Initialize bot
bot = Bot(token=BOT_TOKEN)

# Choose storage: use Supabase if available, otherwise fallback to in-memory
if supabase is None:
    storage = MemoryStorage()
    print("Supabase init failed - using MemoryStorage for FSM")
else:
    storage = SupabaseStorage(supabase)

# Initialize dispatcher with chosen storage
dp = Dispatcher(storage=storage)

# Main menu keyboard
def get_main_menu():
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 New Project", callback_data="menu_new_project")],
        [InlineKeyboardButton(text="📊 Laporan Project", callback_data="menu_laporan_project")]
    ])
    return keyboard

@dp.message(CommandStart())
async def command_start_handler(message: types.Message, state: FSMContext) -> None:
    # Clear any previous FSM state
    await state.clear()
    telegram_id = str(message.from_user.id)
    
    # Debug log - check telegram_id and supabase status
    from database import supabase as _sb
    print(f"[DEBUG] telegram_id={telegram_id}, supabase={'OK' if _sb is not None else 'NONE'}")
    
    # Check registration
    is_registered = await check_user_registered(telegram_id)
    
    if is_registered:
        user_data = await get_user_data(telegram_id)
        nama = user_data.get("nama", message.from_user.full_name)
        
        welcome_text = (
            f"✨ Selamat datang kembali, <b>{nama}</b>! ✨\n\n"
            f"Silakan pilih menu di bawah ini untuk mengelola laporan proyek Anda. "
            f"Pastikan Anda mengisi data dengan teliti ya! 🚀"
        )
        await message.answer(welcome_text, reply_markup=get_main_menu(), parse_mode="HTML")
    else:
        # Not registered -> Start registration FSM
        welcome_text = (
            "👋 **Halo! Sepertinya Anda belum terdaftar di sistem kami.**\n\n"
            f"📌 Telegram ID Anda: `{telegram_id}`\n\n"
            "Silakan lakukan registrasi terlebih dahulu.\n"
            "Ketikkan **Nama Lengkap** Anda untuk memulai:"
        )
        await message.answer(welcome_text, parse_mode="Markdown")
        await state.set_state(Registration.waiting_for_nama)

# Include routers
from handlers_registration import registration_router
from handlers_new_project import new_project_router
from handlers_laporan import laporan_router

dp.include_router(registration_router)
dp.include_router(new_project_router)
dp.include_router(laporan_router)

async def main():
    print("Bot is starting...")
    # Delete webhook to make sure we can run polling locally for testing
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
