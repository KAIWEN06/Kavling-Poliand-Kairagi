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

export const surveyService = {
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
      throw new Error("ID kavling tidak valid saat mengambil status survei.");
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
      throw new Error("ID kavling tidak valid.");
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
