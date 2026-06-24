import io
import csv
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

# --- LOAD CATEGORY STRUCTURE FROM ACTIVITY.csv ---
def load_activities_structure():
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "ACTIVITY.csv"),
        "ACTIVITY.csv",
        "telegram-bot/ACTIVITY.csv",
        "web-dashboard/api/telegram_bot/ACTIVITY.csv",
    ]
    csv_path = None
    for p in possible_paths:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        print("WARNING: ACTIVITY.csv not found. Using built-in fallback structure.")
        return {
            "Instalasi": {
                "BC-TR (GALIAN) / BORING MANUAL / ROJOK (DD-BM)": ["EXCAVATION-0.4","EXCAVATION-0.6","EXCAVATION-1.0","EXCAVATION-1.2","EXCAVATION-1.5","BCTR-ROCK","BD-SK","DD-BRNG-HDPE-40-1","DD-BRNG-HDPE-40-2","DD-BRNG-HDPE-50-1","DD-BRNG-HDPE-50-2","DD-ROD","DD-RV-1","DD-RV-CONCRETE","DD-DS-S1","DD-DS-COD1-M"],
                "PEMASANGAN SUBDUCT / HDPE / PIPA": ["HDPE-40-33","PIPE-BRIDGE","RP-GALVANIS"],
                "PEMBUATAN & PEMASANGAN HANDHOLE": ["MH-HH-170","MH-PIT-120","HH-PIT-80","HH-PIT-P-HA","HH-PIT-P-FAT","HH-PIT-P-FDT","MH-HH-REKONDISI"],
                "PENARIKKAN KABEL FEEDER": ["AC-ADSS-SM-48C","AC-ADSS-SM-96C","AC-ADSS-SM-144C","AC-ADSS-SM-288C"],
                "PENARIKKAN KABEL DISTRIBUSI": ["AC-ADSS-SM-12C","AC-ADSS-SM-24C","AC-ADSS-SM-48C","AC-ADSS-SM-96C"],
                "PEMASANGAN TIANG 7m / 9m": ["NP-6.0-100-1S","NP-7.0-140-2S","NP-7.0-140-3S","NP-9.0-140-3S","NP-CB-7.0-250","NP-CB-9.0-250"],
                "PEMASANGAN ODC": ["FDT-POLE-48C","FDT-POLE-96C","FDT-STDG-96C","FDT-STDG-144C","FDT-STDG-288C"],
                "PEMASANGAN ODP": ["FAT-PB-8C-SOLID","FAT-PB-16C-SOLID","FAT-PDSTL-8","FAT-PDSTL-16"],
                "PEMASANGAN DAN TERMINASI OTB": ["Base Tray ODC","OTB-SM-6","OTB-SM-8","OTB-SM-12","OTB-SM-24","OTB-SM-48","OTB-SM-96","OTB-SM-144","OTB-SM-288"],
                "PEMASANGAN CLOSURE": ["JC-OF-SM-12C","JC-OF-SM-24C","JC-OF-SM-48C","JC-OF-SM-96C","JC-OF-SM-144C","JC-OF-SM-288C"],
                "PEMASANGAN AKSESORIS": ["ACC-STAINLESS BELT","ACC-SUSPENSION AYUN","ACC-HELLICAL","ACC-ANCHORING","ACC-Bracket","ACC-POLESTRAP SPIRAL"],
                "TERMINASI ODC": ["FS-OF-SM","NN-OTDR-CORE","NN-CO-CORE"],
                "TERMINASI ODP": ["FS-OF-SM","NN-CO-CORE"],
                "TERMINASI CLOSURE": ["FS-OF-SM","NN-CO-CORE"],
                "PEMASANGAN IKR/IKG": [],
                "INSTALASI FTM": [],
                "INSTALASI JUMPER FTM (OLT-FEEDER)": [],
            }
        }

    categories_structure = {}
    current_category = ""
    current_sub_category = ""
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter=';')
            for row in reader:
                if not row:
                    continue
                cat = row[0].strip() if len(row) > 0 else ""
                sub = row[1].strip() if len(row) > 1 else ""
                pt  = row[2].strip() if len(row) > 2 else ""

                if cat.startswith("ACTIVITY") or cat.startswith("CATEGORY"):
                    continue
                if cat:
                    current_category = cat
                if sub:
                    current_sub_category = sub
                if not current_category or not current_sub_category:
                    continue
                if current_category not in categories_structure:
                    categories_structure[current_category] = {}
                if current_sub_category not in categories_structure[current_category]:
                    categories_structure[current_category][current_sub_category] = []
                if pt and pt != "-":
                    categories_structure[current_category][current_sub_category].append(pt)
    except Exception as e:
        print(f"Error parsing ACTIVITY.csv: {e}")
    return categories_structure

CATEGORIES_STRUCTURE = load_activities_structure()

# --- Helper: Photo requirement message ---
def get_photo_requirement_message(t: str) -> str:
    if 'BC-TR (GALIAN)' in t: return "\n\n  _\"upload foto dari volume satuan per 100M 1foto jadi jika volume di isi 200 maka wajib upload 2foto\"_\n"
    if 'PEMASANGAN SUBDUCT' in t: return "\n\n  _\"upload foto min 4 foto per laporan\"_\n"
    if 'HANDHOLE' in t: return "\n\n  _\". FOTO PENGUKURAN PANJANG\n  . FOTO PENGUKURAN LEBAR\n  . FOTO PENGUKURAN KEDALAMAN\n  . FOTO TAMPAK JAUH FULL\"_\n"
    if 'KABEL' in t: return "\n\n  _\"FOTO Wajib berdasarkan volume 2 foto \n  . FOTO MARKING START\n  . FOTO MARKING END\n  upload foto dari volume satuan per 200M 1foto jadi jika volume di isi 400 maka wajib upload 2foto\"_\n"
    if 'PEMASANGAN TIANG' in t: return "\n\n  _\". TAMPAK JAUH\n  . TAMPAK ATAS\n  . TAMPAK BAWAH (COR)\n  . TAMPAK DEKAT\"_\n"
    if 'PEMASANGAN ODC' in t: return "\n\n  _\". TAMPAK DALAM TERLIHAT FULL\n  . TAMPAK LUAR POSISI TERTUTUP\n  . TAMPAK JAUH\n  . TAMPAK BLAKANG\"_\n"
    if 'PEMASANGAN ODP' in t: return "\n\n  _\". TAMPAK SAMBUNGAN\n  . TAMPAK ACC ODP\n  . TAMPAK FULL POSISI TERTUTUP DAN SUDAH TERLABEL\n  . EVIDEN REDAMAN PER PORT 1-16\n  . TAMPAK JAUH\"_\n"
    if 'PEMASANGAN DAN TERMINASI OTB' in t: return "\n\n  _\". TAMPAK DEPAN\n  . TAMPAK JAUH\n  . EVIDEN SAAT TERMINASI MIN 4 FOTO\n  . EVIDEN PENGUKURAN\n  . TAMPAK DEKAT/PROSES\"_\n"
    if 'PEMASANGAN CLOSURE' in t: return "\n\n  _\". TAMPAK DALAM\n  . TAMPAK LUAR\n  . EVIDEN SAAT TERMINASI TIAP KASET\n  . TAMPAK JAUH (SUDAH TERTUTUP)\"_\n"
    if 'TERMINASI ODC' in t: return "\n\n  _\"upload foto minimal 2 foto setiap 12 volume core\n  . TAMPAK BESTRAY TERBUKA SAAT SETELAH SELESAI TERMINASI\n  . TAMPAK BESTRAY TERPASANG SAMBIL MENUNJUK\"_\n"
    if 'TERMINASI ODP' in t: return "\n\n  _\"upload foto minimal 2 foto setiap 1 volume core\n  . TAMPAK SETELAH SELESAI TERMINASI\n  . TAMPAK PROGRES TERMINASI\"_\n"
    if 'TERMINASI CLOSURE' in t: return "\n\n  _\"upload foto minimal 2 foto setiap 12 volume core\n  . TAMPAK TIAP KASET\n  . TAMPAK PROGRES\"_\n"
    if 'PERAPIHAN' in t: return "\n\n  _\"UPLOAD FOTO LABELING MIN 4 FOTO\"_\n"
    return "\n"

def get_required_photo_count(t: str, vol: float) -> int:
    required_photos = 1
    if 'GALIAN' in t or 'ROJOK' in t:
        required_photos = max(1, math.ceil(vol / 100))
    elif 'SUBDUCT' in t or 'HDPE' in t or 'PEMASANGAN ODC' in t or 'CLOSURE' in t or 'PERAPIHAN' in t:
        required_photos = 4
    elif 'HANDHOLE' in t or 'TIANG' in t:
        required_photos = max(1, int(vol * 4))
    elif 'FEEDER' in t or 'DISTRIBUSI' in t:
        required_photos = 2 + math.ceil(vol / 200)
    elif 'PEMASANGAN ODP' in t:
        required_photos = max(1, int(vol * 20))
    elif 'OTB' in t:
        required_photos = 8
    elif 'TERMINASI ODC' in t or 'TERMINASI CLOSURE' in t:
        required_photos = max(1, math.ceil(vol / 12) * 2)
    elif 'TERMINASI ODP' in t:
        required_photos = max(1, int(vol * 2))
    return required_photos

def get_uom(designator: str) -> str:
    des_upper = designator.upper()
    if any(k in des_upper for k in ["EXCAVATION", "HDPE", "PIPE", "ADSS"]):
        return "meter"
    elif "CORE" in des_upper or "FS-OF-SM" in des_upper or "OTB-SM" in des_upper:
        return "core"
    elif any(k in des_upper for k in ["NP-", "MH-", "HH-", "FDT-", "FAT-", "JC-", "ACC-", "BRACKET", "BELT"]):
        return "pcs"
    return "Lot"


# ==================== STEP 1: PILIH PROJECT ====================
@laporan_router.callback_query(F.data == "menu_laporan_project")
async def start_laporan(callback: types.CallbackQuery, state: FSMContext):
    projects = await db_get_projects()
    if not projects:
        await callback.answer("Belum ada project aktif. Silakan buat project baru.", show_alert=True)
        return
    keyboard_buttons = []
    for proj in projects:
        btn_text = f"📁 {proj.get('proyek')} ({proj.get('nama_mitra')})"
        keyboard_buttons.append([InlineKeyboardButton(text=btn_text, callback_data=f"selectproj_{proj.get('id')}")])
    keyboard_buttons.append([InlineKeyboardButton(text="❌ Batal", callback_data="cancel_laporan")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    await callback.message.edit_text("📋 **PILIH PROJECT UNTUK DILAPORKAN**\n\nSilakan pilih salah satu project:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_project)


# ==================== STEP 2: PILIH KATEGORI UTAMA ====================
@laporan_router.callback_query(LaporanProgress.waiting_for_project, F.data.startswith("selectproj_"))
async def process_project_select(callback: types.CallbackQuery, state: FSMContext):
    project_id = callback.data.split("_")[1]
    await state.update_data(project_id=project_id)

    main_categories = list(CATEGORIES_STRUCTURE.keys())
    keyboard_buttons = []
    for idx, main_cat in enumerate(main_categories):
        keyboard_buttons.append([InlineKeyboardButton(text=f"📂 {main_cat}", callback_data=f"selectmaincat_{idx}")])
    keyboard_buttons.append([InlineKeyboardButton(text="🔙 Kembali", callback_data="menu_laporan_project")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    await callback.message.edit_text("📍 **PILIH KATEGORI PEKERJAAN**\n\nSilakan pilih kategori utama:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_main_category)


# ==================== STEP 3: PILIH SUB-KATEGORI ====================
@laporan_router.callback_query(LaporanProgress.waiting_for_main_category, F.data.startswith("selectmaincat_"))
async def process_main_category_select(callback: types.CallbackQuery, state: FSMContext):
    main_idx = int(callback.data.split("_")[1])
    main_categories = list(CATEGORIES_STRUCTURE.keys())
    main_cat_name = main_categories[main_idx]
    await state.update_data(main_category=main_cat_name, main_cat_idx=main_idx)

    sub_categories = list(CATEGORIES_STRUCTURE.get(main_cat_name, {}).keys())
    keyboard_buttons = []
    for s_idx, sub_cat in enumerate(sub_categories):
        keyboard_buttons.append([InlineKeyboardButton(text=sub_cat, callback_data=f"selectfold_{main_idx}_{s_idx}")])
    data = await state.get_data()
    project_id = data.get("project_id")
    keyboard_buttons.append([InlineKeyboardButton(text="🔙 Kembali", callback_data=f"selectproj_{project_id}")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    await callback.message.edit_text(f"📁 **KATEGORI: {main_cat_name}**\n\nPilih sub-kategori:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_folder)


# ==================== STEP 4: PILIH DESIGNATOR ====================
@laporan_router.callback_query(LaporanProgress.waiting_for_folder, F.data.startswith("selectfold_"))
async def process_folder_select(callback: types.CallbackQuery, state: FSMContext):
    parts = callback.data.split("_")
    main_idx = int(parts[1])
    sub_idx = int(parts[2])

    main_categories = list(CATEGORIES_STRUCTURE.keys())
    main_cat_name = main_categories[main_idx]
    sub_categories = list(CATEGORIES_STRUCTURE.get(main_cat_name, {}).keys())
    sub_cat_name = sub_categories[sub_idx]
    await state.update_data(folder_name=sub_cat_name, sub_cat_idx=sub_idx)

    designators = CATEGORIES_STRUCTURE.get(main_cat_name, {}).get(sub_cat_name, [])

    # If no designators, skip straight to volume input using sub_cat as the designator
    if not designators:
        uom = get_uom(sub_cat_name)
        await state.update_data(designator=sub_cat_name, uom=uom)
        await callback.message.edit_text(
            f"📊 **SUB-KATEGORI: {sub_cat_name} ({uom})**\n\nSilakan masukkan **Volume Aktual** (berupa angka):"
        )
        await state.set_state(LaporanProgress.waiting_for_volume)
        return

    keyboard_buttons = []
    for i in range(0, len(designators), 2):
        row = [
            InlineKeyboardButton(text=designators[j], callback_data=f"selectdesig_{main_idx}_{sub_idx}_{j}")
            for j in range(i, min(i + 2, len(designators)))
        ]
        keyboard_buttons.append(row)
    keyboard_buttons.append([InlineKeyboardButton(text="🔙 Kembali", callback_data=f"selectmaincat_{main_idx}")])
    kb = InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)
    await callback.message.edit_text(f"⚙️ **SUB-KATEGORI: {sub_cat_name}**\n\nPilih Designator Pekerjaan:", reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_designator)


# ==================== STEP 5: DESIGNATOR DIPILIH -> INPUT VOLUME ====================
@laporan_router.callback_query(LaporanProgress.waiting_for_designator, F.data.startswith("selectdesig_"))
async def process_designator_select(callback: types.CallbackQuery, state: FSMContext):
    parts = callback.data.split("_")
    main_idx = int(parts[1])
    sub_idx = int(parts[2])
    des_idx = int(parts[3])

    main_categories = list(CATEGORIES_STRUCTURE.keys())
    main_cat_name = main_categories[main_idx]
    sub_categories = list(CATEGORIES_STRUCTURE.get(main_cat_name, {}).keys())
    sub_cat_name = sub_categories[sub_idx]
    designators = CATEGORIES_STRUCTURE.get(main_cat_name, {}).get(sub_cat_name, [])
    designator = designators[des_idx]

    uom = get_uom(designator)
    await state.update_data(designator=designator, uom=uom)
    await callback.message.edit_text(f"📊 **DESIGNATOR: {designator} ({uom})**\n\nSilakan masukkan **Volume Aktual** (berupa angka):")
    await state.set_state(LaporanProgress.waiting_for_volume)


# ==================== STEP 6: INPUT VOLUME -> UPLOAD FOTO ====================
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
    category_name = data.get("folder_name")
    designator = data.get("designator")

    min_photos = get_required_photo_count(category_name, volume)
    req_message = get_photo_requirement_message(category_name)

    await state.update_data(min_photos=min_photos, req_message=req_message, evidence_files=[])

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Selesai Upload", callback_data="selesai_upload_photos")]
    ])

    instructions = (
        f"📸 **UPLOAD FOTO EVIDENT**\n\n"
        f"Pekerjaan: **{designator}** (Volume: {volume} {data.get('uom')})\n"
        f"Wajib mengirim minimal: **{min_photos} foto**.\n"
        f"{req_message}\n"
        f"Silakan kirim foto satu per satu (sebagai compressed photo, bukan berkas/document).\n"
        f"Jika semua foto sudah terkirim, klik tombol **Selesai Upload** di bawah."
    )
    await message.answer(instructions, reply_markup=kb, parse_mode="Markdown")
    await state.set_state(LaporanProgress.waiting_for_photos)


# ==================== STEP 7: TERIMA FOTO ====================
@laporan_router.message(LaporanProgress.waiting_for_photos, F.photo)
async def process_photo_upload(message: types.Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    evidence_files = data.get("evidence_files", [])

    photo_file = message.photo[-1]
    file_id = photo_file.file_id

    forwarded_msg_id = None
    if STORAGE_CHANNEL_ID != 0:
        try:
            forwarded = await bot.forward_message(
                chat_id=STORAGE_CHANNEL_ID,
                from_chat_id=message.chat.id,
                message_id=message.message_id
            )
            forwarded_msg_id = forwarded.message_id
        except Exception as e:
            print("Error forwarding photo to channel:", e)

    evidence_files.append({"file_id": file_id, "message_id": forwarded_msg_id})
    await state.update_data(evidence_files=evidence_files)

    current_count = len(evidence_files)
    min_photos = data.get("min_photos", 1)
    await message.reply(f"✅ Foto ke-{current_count} berhasil diterima. ({current_count}/{min_photos} foto)")


# ==================== STEP 8: SELESAI UPLOAD -> KONFIRMASI ====================
@laporan_router.callback_query(LaporanProgress.waiting_for_photos, F.data == "selesai_upload_photos")
async def finish_photo_upload(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    evidence_files = data.get("evidence_files", [])
    min_photos = data.get("min_photos", 1)

    if len(evidence_files) < min_photos:
        await callback.answer(f"❌ Jumlah foto kurang! Minimal harus ada {min_photos} foto.", show_alert=True)
        return

    project_id = data.get("project_id")
    project = await db_get_project_by_id(project_id)

    summary = (
        "📝 **KONFIRMASI LAPORAN PROGRESS** 📝\n\n"
        f"🏢 **Project:** {project.get('proyek')} ({project.get('nama_mitra')})\n"
        f"📂 **Kategori Utama:** {data.get('main_category')}\n"
        f"📍 **Sub-Kategori:** {data.get('folder_name')}\n"
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


# ==================== STEP 9: SIMPAN LAPORAN ====================
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


# ==================== STEP 10: GENERATE DOCX (OPTIONAL) ====================
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
            filename = f"Laporan_{folder_name}_{designator}.docx".replace(" ", "_")
            doc_file = types.BufferedInputFile(doc_stream.read(), filename=filename)
            await callback.message.answer_document(document=doc_file)
            await callback.message.answer("✅ Dokumen berhasil dikirim!")
        except Exception as e:
            await callback.message.answer(f"❌ Gagal men-generate dokumen: {e}")
    else:
        await callback.message.edit_text("🆗 Pengisian selesai. Kembali ke menu utama.")

    await state.clear()


# ==================== CANCEL HANDLER ====================
@laporan_router.callback_query(F.data == "cancel_laporan")
async def cancel_laporan(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Input laporan progress dibatalkan.")
    await state.clear()
