from aiogram import Router, F, types
from aiogram.fsm.context import FSMContext
from states import Registration
from database import register_user

registration_router = Router()

def get_main_menu():
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 New Project", callback_data="menu_new_project")],
        [InlineKeyboardButton(text="📊 Laporan Project", callback_data="menu_laporan_project")]
    ])
    return keyboard

@registration_router.message(Registration.waiting_for_nama)
async def process_nama_lengkap(message: types.Message, state: FSMContext):
    await state.update_data(nama_lengkap=message.text)
    
    # Inline keyboard for Status (USER or ADMIN)
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="👷 Pelaksana (USER)", callback_data="role_USER"),
            InlineKeyboardButton(text="🔑 Pengawas (ADMIN)", callback_data="role_ADMIN")
        ]
    ])
    
    await message.answer("Silakan pilih peran (status) Anda:", reply_markup=kb)
    await state.set_state(Registration.waiting_for_status)

@registration_router.callback_query(Registration.waiting_for_status, F.data.startswith("role_"))
async def process_status(callback: types.CallbackQuery, state: FSMContext):
    role = callback.data.split("_")[1]
    await state.update_data(status=role)
    
    await callback.message.edit_text(f"Peran terpilih: **{role}**\n\nMasukkan password untuk login Web Dashboard Anda:")
    await state.set_state(Registration.waiting_for_password)

@registration_router.message(Registration.waiting_for_password)
async def process_password(message: types.Message, state: FSMContext):
    password_web = message.text
    telegram_id = str(message.from_user.id)
    username = message.from_user.username or "no_username"
    
    data = await state.get_data()
    nama_lengkap = data.get("nama_lengkap")
    status = data.get("status")
    
    # Save to Supabase
    success = await register_user(
        telegram_id=telegram_id,
        username=username,
        nama_lengkap=nama_lengkap,
        status=status,
        password_web=password_web
    )
    
    if success:
        welcome_text = (
            f"🎉 **Registrasi Berhasil!** 🎉\n\n"
            f"👤 **Nama:** {nama_lengkap}\n"
            f"🔑 **Peran:** {status}\n"
            f"🆔 **Telegram ID:** `{telegram_id}`\n\n"
            f"Silakan gunakan menu di bawah untuk mengelola proyek Anda."
        )
        await message.answer(welcome_text, reply_markup=get_main_menu(), parse_mode="Markdown")
        await state.clear()
    else:
        await message.answer("❌ Terjadi kesalahan saat menyimpan registrasi. Silakan ketik ulang password Anda untuk mencoba lagi:")
