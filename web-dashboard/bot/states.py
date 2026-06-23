from aiogram.fsm.state import StatesGroup, State

class Registration(StatesGroup):
    waiting_for_nama = State()
    waiting_for_status = State()
    waiting_for_password = State()

class NewProject(StatesGroup):
    waiting_for_nama_mitra = State()
    waiting_for_nama_user = State()
    waiting_for_proyek = State()
    waiting_for_no_kontrak = State()
    waiting_for_no_po = State()
    waiting_for_area = State()
    waiting_for_site_operation = State()
    waiting_for_pelaksana = State()
    confirm_data = State()

class LaporanProgress(StatesGroup):
    waiting_for_project = State()
    waiting_for_folder = State()
    waiting_for_designator = State()
    waiting_for_volume = State()
    waiting_for_photos = State()
    confirm_report = State()
