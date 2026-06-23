import asyncio
import os
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

from database import check_user_registered, get_user_data
from states import Registration, NewProject

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize bot and dispatcher
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Main menu keyboard
def get_main_menu():
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 New Project", callback_data="menu_new_project")],
        [InlineKeyboardButton(text="📊 Laporan Project", callback_data="menu_laporan_project")]
    ])
    return keyboard

@dp.message(CommandStart())
async def command_start_handler(message: types.Message) -> None:
    telegram_id = str(message.from_user.id)
    
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
        # Not registered
        welcome_text = (
            "👋 Halo! Sepertinya Anda belum terdaftar di sistem kami.\n"
            "Silakan lakukan registrasi terlebih dahulu."
        )
        # TODO: Start registration FSM
        await message.answer(welcome_text)

# Include routers
from handlers_new_project import new_project_router
dp.include_router(new_project_router)

async def main():
    print("Bot is starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
