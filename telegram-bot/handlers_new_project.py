from aiogram import Router, F, types
from aiogram.fsm.context import FSMContext
from states import NewProject

new_project_router = Router()

@new_project_router.callback_query(F.data == "menu_new_project")
async def start_new_project(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.answer("📝 **FORM PENGISIAN PROJECT BARU**\n\nSilakan masukkan **Nama Mitra**:")
    await state.set_state(NewProject.waiting_for_nama_mitra)

@new_project_router.message(NewProject.waiting_for_nama_mitra)
async def process_nama_mitra(message: types.Message, state: FSMContext):
    await state.update_data(nama_mitra=message.text)
    await message.answer("Bagus! Sekarang masukkan **Nama User**:")
    await state.set_state(NewProject.waiting_for_nama_user)

@new_project_router.message(NewProject.waiting_for_nama_user)
async def process_nama_user(message: types.Message, state: FSMContext):
    await state.update_data(nama_user=message.text)
    await message.answer("Masukkan nama **Proyek**:")
    await state.set_state(NewProject.waiting_for_proyek)

@new_project_router.message(NewProject.waiting_for_proyek)
async def process_proyek(message: types.Message, state: FSMContext):
    await state.update_data(proyek=message.text)
    await message.answer("Masukkan **No Kontrak**:")
    await state.set_state(NewProject.waiting_for_no_kontrak)

@new_project_router.message(NewProject.waiting_for_no_kontrak)
async def process_no_kontrak(message: types.Message, state: FSMContext):
    await state.update_data(no_kontrak=message.text)
    await message.answer("Masukkan **Nomor PO**:")
    await state.set_state(NewProject.waiting_for_no_po)

@new_project_router.message(NewProject.waiting_for_no_po)
async def process_no_po(message: types.Message, state: FSMContext):
    await state.update_data(no_po=message.text)
    await message.answer("Masukkan **Area/Lokasi**:")
    await state.set_state(NewProject.waiting_for_area)

@new_project_router.message(NewProject.waiting_for_area)
async def process_area(message: types.Message, state: FSMContext):
    await state.update_data(area=message.text)
    await message.answer("Masukkan **Site Operation**:")
    await state.set_state(NewProject.waiting_for_site_operation)

@new_project_router.message(NewProject.waiting_for_site_operation)
async def process_site_operation(message: types.Message, state: FSMContext):
    await state.update_data(site_operation=message.text)
    await message.answer("Terakhir, masukkan nama **Pelaksana**:")
    await state.set_state(NewProject.waiting_for_pelaksana)

@new_project_router.message(NewProject.waiting_for_pelaksana)
async def process_pelaksana(message: types.Message, state: FSMContext):
    await state.update_data(pelaksana=message.text)
    
    data = await state.get_data()
    
    summary = (
        "✅ **KONFIRMASI DATA PROJECT** ✅\n\n"
        f"🏢 **Mitra:** {data.get('nama_mitra')}\n"
        f"👤 **User:** {data.get('nama_user')}\n"
        f"📁 **Proyek:** {data.get('proyek')}\n"
        f"📄 **No Kontrak:** {data.get('no_kontrak')}\n"
        f"🔢 **No PO:** {data.get('no_po')}\n"
        f"📍 **Area:** {data.get('area')}\n"
        f"⚙️ **Site Ops:** {data.get('site_operation')}\n"
        f"👷 **Pelaksana:** {data.get('pelaksana')}\n\n"
        "Apakah data di atas sudah benar dan ingin disimpan ke database?"
    )
    
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💾 Simpan ke Database", callback_data="save_new_project")],
        [InlineKeyboardButton(text="❌ Batal/Ulangi", callback_data="cancel_new_project")]
    ])
    
    await message.answer(summary, reply_markup=kb, parse_mode="Markdown")
    await state.set_state(NewProject.confirm_data)

@new_project_router.callback_query(F.data == "save_new_project")
async def save_project(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    from database import db_create_project
    
    await db_create_project(
        nama_mitra=data.get('nama_mitra'),
        nama_user=data.get('nama_user'),
        proyek=data.get('proyek'),
        no_kontrak=data.get('no_kontrak'),
        no_po=data.get('no_po'),
        area_lokasi=data.get('area'),
        site_operation=data.get('site_operation'),
        pelaksana=data.get('pelaksana')
    )
    
    await callback.message.edit_text("🎉 **Data berhasil disimpan ke Database!**\n\nGunakan menu Laporan Project untuk mulai melaporkan progres harian Anda.", parse_mode="Markdown")
    await state.clear()

@new_project_router.callback_query(F.data == "cancel_new_project")
async def cancel_project(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Pengisian data dibatalkan. Kembali ke menu utama.")
    await state.clear()
