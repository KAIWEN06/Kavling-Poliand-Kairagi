import { supabase } from "./config/supabase";

export type SurveyStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export interface ClientSurveyRequest {
  id: string;
  lot_id: number;
  client_id: string;
  scheduled_at: string;
  note: string | null;
  status: SurveyStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSurveyRequest extends ClientSurveyRequest {
  lots: { lot_number: string } | { lot_number: string }[] | null;
}

export interface SurveyRequestInput {
  lotId: number;
  scheduledAt: string;
  note?: string | null;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message ?? "Terjadi kesalahan survei."));
  }
  return new Error("Terjadi kesalahan pada layanan survei.");
}

export interface LotSurveySchedule {
  lot_id: number;
  scheduled_at: string;
  status: "pending" | "confirmed";
}

/** Jadwal survei aktif satu kavling, siap ditampilkan di semua role. */
export interface LotSurveyInfo {
  status: "pending" | "confirmed";
  scheduledAt: number;
  when: string;
  statusText: string;
}

export function formatSurveyWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Jadwal tidak valid";
  const date = d.toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Makassar",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Makassar",
  }).replace(".", ":");
  return `${date} · ${time} WITA`;
}

/** Satu kavling bisa punya beberapa jadwal: ambil yang paling dekat. */
export function buildSurveyMap(rows: LotSurveySchedule[]): Map<number, LotSurveyInfo> {
  const map = new Map<number, LotSurveyInfo>();
  for (const r of rows) {
    const at = Date.parse(r.scheduled_at);
    if (Number.isNaN(at)) continue;
    const lotId = Number(r.lot_id);
    const existing = map.get(lotId);
    if (existing && existing.scheduledAt <= at) continue;
    map.set(lotId, {
      status: r.status,
      scheduledAt: at,
      when: formatSurveyWhen(r.scheduled_at),
      statusText: r.status === "pending" ? "Menunggu konfirmasi" : "Sudah dikonfirmasi",
    });
  }
  return map;
}

/** Kavling berjadwal survei di atas (terdekat dulu), sisanya mengikuti urutan semula. */
export function pinSurveyLots<T extends { id: number }>(list: T[], map: Map<number, LotSurveyInfo>): T[] {
  if (map.size === 0) return list;
  const scheduled = list
    .filter((l) => map.has(l.id))
    .sort((a, b) => map.get(a.id)!.scheduledAt - map.get(b.id)!.scheduledAt);
  return [...scheduled, ...list.filter((l) => !map.has(l.id))];
}

/** Satu baris agenda survei untuk kartu beranda. customer_name null untuk role client. */
export interface SurveyAgendaItem {
  survey_id: string;
  lot_id: number;
  lot_number: string | null;
  scheduled_at: string;
  status: "pending" | "confirmed";
  customer_id: number | null;
  customer_name: string | null;
}

export const surveyService = {
  /** Agenda survei aktif (terdekat dulu) sesuai cakupan role pemanggil. */
  async getMyAgenda(): Promise<SurveyAgendaItem[]> {
    const { data, error } = await supabase.rpc("get_my_survey_agenda");
    if (error) throw normalizeError(error);
    return (data ?? []) as SurveyAgendaItem[];
  },

  /**
   * Jadwal survei aktif sesuai cakupan role pemanggil (client: miliknya,
   * marketing: client-nya, admin/kepala marketing: semua). Dibatasi di server.
   */
  async getMySchedule(): Promise<Map<number, LotSurveyInfo>> {
    const { data, error } = await supabase.rpc("get_my_survey_schedule");
    if (error) throw normalizeError(error);
    return buildSurveyMap((data ?? []) as LotSurveySchedule[]);
  },

  /**
   * Ambil slot yang sudah terisi untuk tanggal WITA tertentu.
   * RPC mengembalikan slot_time, bukan identitas client.
   */
  async getBookedSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase.rpc("get_booked_survey_slots", {
      p_date: date,
    });
    if (error) throw normalizeError(error);

    return (data ?? [])
      .map((row: { slot_time?: string }) => String(row.slot_time ?? "").slice(0, 5))
      .filter((value: string) => /^\d{2}:\d{2}$/.test(value));
  },

  /**
   * Client hanya membaca pengajuan miliknya sendiri.
   * RLS tetap wajib aktif di database sebagai lapisan keamanan utama.
   */
  async getClientRequests(lotId?: number): Promise<ClientSurveyRequest[]> {
    if (lotId !== undefined && (!Number.isInteger(lotId) || lotId <= 0)) {
      throw new Error("ID kaveling tidak valid saat mengambil status survei.");
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw normalizeError(authError);
    const userId = authData.user?.id;
    if (!userId) throw new Error("Sesi login berakhir. Silakan login kembali.");

    let query = supabase
      .from("survey_requests")
      .select("id, lot_id, client_id, scheduled_at, note, status, rejection_reason, created_at, updated_at")
      .eq("client_id", userId)

    if (lotId !== undefined) query = query.eq("lot_id", lotId)

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw normalizeError(error);
    return (data ?? []) as ClientSurveyRequest[];
  },

  /**
   * Admin/Owner/Kepala Bagian melihat seluruh permintaan.
   */
  async getAdminRequests(): Promise<AdminSurveyRequest[]> {
    const { data, error } = await supabase
      .from("survey_requests")
      .select("id, lot_id, client_id, scheduled_at, note, status, rejection_reason, created_at, updated_at, lots(lot_number)")
      .order("scheduled_at", { ascending: true });

    if (error) throw normalizeError(error);
    return (data ?? []) as unknown as AdminSurveyRequest[];
  },

  /**
   * Status hanya boleh diubah melalui RPC yang memeriksa role di server.
   * Penolakan wajib menyertakan alasan.
   */
  async updateAdminRequestStatus(
    id: string,
    status: SurveyStatus,
    rejectionReason: string | null = null,
  ): Promise<void> {
    if (!id) throw new Error("ID pengajuan survei tidak valid.");
    if (status === "rejected" && !rejectionReason?.trim()) {
      throw new Error("Alasan penolakan wajib diisi.");
    }

    const { error } = await supabase.rpc("admin_update_survey_request_status", {
      p_request_id: id,
      p_status: status,
      p_rejection_reason: rejectionReason?.trim() || null,
    });

    if (error) throw normalizeError(error);
  },

  /**
   * Membuat pengajuan melalui RPC database.
   * RPC wajib memasukkan status pending dan memvalidasi jam + bentrok.
   */
  async requestSurvey(input: SurveyRequestInput): Promise<string> {
    if (!Number.isInteger(input.lotId) || input.lotId <= 0) {
      throw new Error("ID kaveling tidak valid.");
    }
    if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) {
      throw new Error("Tanggal dan jam survei tidak valid.");
    }

    const { data, error } = await supabase.rpc("request_lot_survey", {
      p_lot_id: input.lotId,
      p_scheduled_at: input.scheduledAt,
      p_note: input.note?.trim() || null,
    });

    if (error) throw normalizeError(error);
    return String(data);
  },
};

export function isSurveySlotConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string; details?: string };
  const message = `${value.message ?? ""} ${value.details ?? ""}`.toLowerCase();
  return value.code === "23505"
    || value.code === "23P01"
    || message.includes("slot_already_booked")
    || message.includes("survey_requests_no_active_overlap")
    || message.includes("survey_requests_one_active_slot_uidx");
}
