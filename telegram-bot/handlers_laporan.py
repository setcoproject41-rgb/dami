import io
import math
import os
from aiogram import Router, F, types, Bot
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from states import LaporanProgress
from database import db_get_projects, db_get_project_by_id, db_save_progress_report, db_get_progress_reports
from doc_generator import generate_report_docx

laporan_router = Router()

STORAGE_CHANNEL_ID = int(os.environ.get("STORAGE_CHANNEL_ID", "0"))

PREDEFINED_FOLDERS = [
    "MGL - JT.01",
    "JT.01 - JT.02",
    "JT.02 - JT.03",
    "JT.03 - JT.04",
    "JT.04 - JT.05",
    "JT.05 - JT.06",
    "JT.06 - JT.07",
    "JT.07 - JT.08",
    "JT.08 - JT.09",
    "JT.09 - TEM"
]

ALL_DESIGNATORS = [
    "DC-OF-SM-48C", "AC-OF-SM-48C", "SC-OF-SM-48", "OS-SM-1", "TC-SM-48", 
    "PU-S7.0-140", "PU-S9.0-140", "PU-AS", "PP-OF-IN", "DD-S3-1", 
    "DD-BSS-S1", "HB-PS-1", "DD-BM-100-1", "DD-BM-HDPE-40-1", 
    "DD-HDPE-40-1", "DD-ROD", "DD-RV-1", "DD-RV-CONCRETE", "DD-RV-C",
    "MH-HH2", "BC-TR-SOIL-1", "BC-TR-SOIL-2", "BC-TR-C-1", "BC-TR-C-5", 
    "SLACK SUPPORT POLE"
]

CAT_A = [
    "DD-S3-1", "DD-BSS-S1", "HB-PS-1", "DD-BTS-S1", "OS-SM-1", 
    "SLACK SUPPORT POLE", "PU-S7.0-140", "PU-S9.0-140", "PU-AS", 
    "MH-HH2", "DD-RV-C", "TC-SM-48", "SC-OF-SM-48", "PP-OF-IN"
]

def get_min_photos(designator: str, volume: float) -> int:
    if designator in CAT_A:
        return 1
    else:
        return math.ceil(volume / 25.0)

def get_uom(designator: str) -> str:
    if designator in ["PU-S7.0-140", "PU-S9.0-140", "PU-AS"]:
        return "pcs"
    elif "BC-TR" in designator or "DD-HDPE" in designator or "DD-BM" in designator:
        return "meter"
    return "Lot"

# 1. Menu Trigger
@laporan_router.callback_query(F.data == "menu_laporan_project")
async def start_laporan(callback: types.CallbackQuery, state: FSMContext):
    projects = await db_get_projects()
    if not projects:
        await callback.answer("Belum ada project aktif di database. Silakan buat project baru.", show_alert=True)
        return
        
    keyboard_buttons = []
    for proj in projects:
        btn_text = f"📁 {proj.get('proyek')} ({proj.get('nama_mitra')})"
        keyboard_buttons.append([InlineKeyboardButton(text=btn_text, callback_data=f"selectproj_{proj.get('id')}")])
        
    keyboard_buttons.append([InlineKeyboardButton(text="❌ Batal", callback_data="cancel_laporan")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    
    await callback.message.edit_text("📋 **PILIH PROJECT UNTUK DILAPORKAN**\n\nSilakan pilih salah satu project:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_project)

# 2. Project Selected -> Select Folder
@laporan_router.callback_query(LaporanProgress.waiting_for_project, F.data.startswith("selectproj_"))
async def process_project_select(callback: types.CallbackQuery, state: FSMContext):
    project_id = callback.data.split("_")[1]
    await state.update_data(project_id=project_id)
    
    keyboard_buttons = []
    for i in range(0, len(PREDEFINED_FOLDERS), 2):
        row = [
            InlineKeyboardButton(text=PREDEFINED_FOLDERS[j], callback_data=f"selectfold_{PREDEFINED_FOLDERS[j]}")
            for j in range(i, min(i+2, len(PREDEFINED_FOLDERS)))
        ]
        keyboard_buttons.append(row)
        
    keyboard_buttons.append([InlineKeyboardButton(text="🔙 Kembali", callback_data="menu_laporan_project")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    
    await callback.message.edit_text("📍 **PILIH SEKTOR / FOLDER PEKERJAAN**\n\nSilakan pilih sub-sektor lokasi:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_folder)

# 3. Folder Selected -> Select Designator
@laporan_router.callback_query(LaporanProgress.waiting_for_folder, F.data.startswith("selectfold_"))
async def process_folder_select(callback: types.CallbackQuery, state: FSMContext):
    folder_name = callback.data.split("_")[1]
    await state.update_data(folder_name=folder_name)
    
    keyboard_buttons = []
    for i in range(0, len(ALL_DESIGNATORS), 2):
        row = [
            InlineKeyboardButton(text=ALL_DESIGNATORS[j], callback_data=f"selectdesig_{ALL_DESIGNATORS[j]}")
            for j in range(i, min(i+2, len(ALL_DESIGNATORS)))
        ]
        keyboard_buttons.append(row)
        
    # Get current project_id for back button
    data = await state.get_data()
    project_id = data.get("project_id")
    
    keyboard_buttons.append([InlineKeyboardButton(text="🔙 Kembali", callback_data=f"selectproj_{project_id}")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    
    await callback.message.edit_text(f"⚙️ **SEKTOR: {folder_name}**\n\nPilih Designator Pekerjaan:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_designator)

# 4. Designator Selected -> Input Volume
@laporan_router.callback_query(LaporanProgress.waiting_for_designator, F.data.startswith("selectdesig_"))
async def process_designator_select(callback: types.CallbackQuery, state: FSMContext):
    designator = callback.data.split("_")[1]
    uom = get_uom(designator)
    await state.update_data(designator=designator, uom=uom)
    
    await callback.message.edit_text(f"📊 **DESIGNATOR: {designator} ({uom})**\n\nSilakan masukkan **Volume Aktual** (berupa angka):")
    await state.set_state(LaporanProgress.waiting_for_volume)

# 5. Volume Inputted -> Start Photo Uploads
@laporan_router.message(LaporanProgress.waiting_for_volume)
async def process_volume(message: types.Message, state: FSMContext):
    try:
        volume = float(message.text)
        if volume <= 0:
            raise ValueError
        await state.update_data(volume=volume)
    except ValueError:
        await message.answer("❌ Volume harus berupa angka positif! Silakan masukkan volume kembali:")
        return
        
    data = await state.get_data()
    designator = data.get("designator")
    min_photos = get_min_photos(designator, volume)
    
    await state.update_data(min_photos=min_photos, evidence_files=[])
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Selesai Upload", callback_data="selesai_upload_photos")]
    ])
    
    instructions = (
        f"📸 **UPLOAD FOTO EVIDENT**\n\n"
        f"Pekerjaan: **{designator}** (Volume: {volume} {data.get('uom')})\n"
        f"Wajib mengirim minimal: **{min_photos} foto**.\n\n"
        f"Silakan kirim foto satu per satu (sebagai compressed photo, bukan berkas/document).\n"
        f"Jika semua foto sudah terkirim, klik tombol **Selesai Upload** di bawah."
    )
    await message.answer(instructions, reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_photos)

# 6. Receive Photo
@laporan_router.message(LaporanProgress.waiting_for_photos, F.photo)
async def process_photo_upload(message: types.Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    evidence_files = data.get("evidence_files", [])
    
    photo_file = message.photo[-1]
    file_id = photo_file.file_id
    
    # Forward photo to the storage channel
    forwarded = None
    if STORAGE_CHANNEL_ID != 0:
        try:
            forwarded = await bot.forward_message(
                chat_id=STORAGE_CHANNEL_ID,
                from_chat_id=message.chat.id,
                message_id=message.message_id
            )
        except Exception as e:
            print("Error forwarding photo to channel:", e)
            
    forwarded_msg_id = forwarded.message_id if forwarded else None
    
    evidence_files.append({
        "file_id": file_id,
        "message_id": forwarded_msg_id
    })
    
    await state.update_data(evidence_files=evidence_files)
    
    current_count = len(evidence_files)
    min_photos = data.get("min_photos", 1)
    
    await message.reply(f"✅ Foto ke-{current_count} berhasil diterima. ({current_count}/{min_photos} foto)")

# 7. Selesai Upload -> Confirmation
@laporan_router.callback_query(LaporanProgress.waiting_for_photos, F.data == "selesai_upload_photos")
async def finish_photo_upload(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    evidence_files = data.get("evidence_files", [])
    min_photos = data.get("min_photos", 1)
    
    if len(evidence_files) < min_photos:
        await callback.answer(f"❌ Jumlah foto kurang! Minimal harus ada {min_photos} foto.", show_alert=True)
        return
        
    # Get project details for confirmation
    project_id = data.get("project_id")
    project = await db_get_project_by_id(project_id)
    
    summary = (
        "📝 **KONFIRMASI LAPORAN PROGRESS** 📝\n\n"
        f"🏢 **Project:** {project.get('proyek')} ({project.get('nama_mitra')})\n"
        f"📍 **Sektor/Folder:** {data.get('folder_name')}\n"
        f"⚙️ **Designator:** {data.get('designator')}\n"
        f"📊 **Volume:** {data.get('volume')} {data.get('uom')}\n"
        f"📸 **Jumlah Foto:** {len(evidence_files)} foto\n\n"
        "Apakah data laporan di atas sudah benar?"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💾 Simpan Laporan", callback_data="save_laporan")],
        [InlineKeyboardButton(text="❌ Batal", callback_data="cancel_laporan")]
    ])
    
    await callback.message.edit_text(summary, reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.confirm_report)

# 8. Save Report -> Ask for DOCX
@laporan_router.callback_query(LaporanProgress.confirm_report, F.data == "save_laporan")
async def save_laporan(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    telegram_id = str(callback.from_user.id)
    
    success = await db_save_progress_report(
        project_id=data.get("project_id"),
        telegram_id=telegram_id,
        kategori=data.get("folder_name"),
        sub_kategori=data.get("designator"),
        volume_input=data.get("volume"),
        satuan=data.get("uom"),
        evidence_files=data.get("evidence_files")
    )
    
    if success:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📝 Ya, Unduh Word (.docx)", callback_data="docx_yes")],
            [InlineKeyboardButton(text="❌ Selesai", callback_data="docx_no")]
        ])
        await callback.message.edit_text(
            "🎉 **Laporan progress berhasil disimpan ke Database!**\n\n"
            "Apakah Anda ingin mengunduh dokumen Word (.docx) lampiran laporan untuk sub-kategori ini sekarang?",
            reply_markup=kb, parse_mode="Markdown"
        )
    else:
        await callback.message.edit_text("❌ Gagal menyimpan laporan ke database. Hubungi Administrator.")
        await state.clear()

# 9. Generate Selective DOCX
@laporan_router.callback_query(F.data.startswith("docx_"))
async def handle_docx_choice(callback: types.CallbackQuery, state: FSMContext, bot: Bot):
    choice = callback.data.split("_")[1]
    
    if choice == "yes":
        await callback.message.edit_text("⏳ Sedang mengunduh foto & menyusun dokumen Word, mohon tunggu...")
        
        data = await state.get_data()
        project_id = data.get("project_id")
        folder_name = data.get("folder_name")
        designator = data.get("designator")
        evidence_files = data.get("evidence_files", [])
        
        project = await db_get_project_by_id(project_id)
        
        # Download images in-memory
        image_streams = []
        for idx, file_info in enumerate(evidence_files):
            file_id = file_info.get("file_id")
            try:
                file_io = io.BytesIO()
                await bot.download(file=file_id, destination=file_io)
                file_io.seek(0)
                image_streams.append(file_io)
            except Exception as e:
                print(f"Error downloading photo {idx} from telegram: {e}")
                
        # Generate word document
        try:
            doc_stream = generate_report_docx(
                report_title=f"Laporan Evidence - {folder_name} - {designator}",
                project_data={
                    "proyek": project.get("proyek"),
                    "no_kontrak": project.get("no_kontrak"),
                    "no_po": project.get("nomor_po"),
                    "area": project.get("area_lokasi"),
                    "site_operation": project.get("site_operation"),
                    "pelaksana": project.get("pelaksana")
                },
                image_streams=image_streams
            )
            
            # Send file to user
            filename = f"Laporan_{folder_name}_{designator}.docx".replace(" ", "_")
            doc_file = types.BufferedInputFile(doc_stream.read(), filename=filename)
            await callback.message.answer_document(document=doc_file)
            await callback.message.answer("✅ Dokumen berhasil dikirim!")
        except Exception as e:
            await callback.message.answer(f"❌ Gagal men-generate dokumen: {e}")
            
    else:
        await callback.message.edit_text("🆗 Pengisian selesai. Kembali ke menu utama.")
        
    await state.clear()

# 10. Cancel Handler
@laporan_router.callback_query(F.data == "cancel_laporan")
async def cancel_laporan(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Input laporan progress dibatalkan.")
    await state.clear()
