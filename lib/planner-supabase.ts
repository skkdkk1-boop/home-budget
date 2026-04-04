"use client";

import type { PlannerData } from "@/lib/planner-types";
import { parseStoredPlannerData } from "@/lib/planner-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const PLANNER_DOCUMENTS_TABLE = "planner_documents";
const PLANNER_SHARES_TABLE = "planner_shares";
const GET_PLANNER_SHARE_FUNCTION = "get_planner_share";

interface PlannerDocumentRow {
  user_id: string;
  data: unknown;
  updated_at?: string;
}

interface PlannerShareRow {
  id: string;
  snapshot: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface PlannerShareSnapshot {
  id: string;
  data: PlannerData;
  createdAt: string;
  updatedAt: string;
}

function parsePlannerDocumentData(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return parseStoredPlannerData(JSON.stringify(value));
}

function parsePlannerShareSnapshot(value: PlannerShareRow | null) {
  if (!value) {
    return null;
  }

  const data = parsePlannerDocumentData(value.snapshot);

  if (!data) {
    return null;
  }

  return {
    id: value.id,
    data,
    createdAt: value.created_at ?? "",
    updatedAt: value.updated_at ?? value.created_at ?? "",
  } satisfies PlannerShareSnapshot;
}

export function isMissingPlannerDocumentsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";

  return (
    code === "42P01" ||
    message.includes(PLANNER_DOCUMENTS_TABLE) ||
    message.toLowerCase().includes("does not exist")
  );
}

export function isMissingPlannerSharesSetupError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const lowerMessage = message.toLowerCase();

  return (
    code === "42P01" ||
    code === "42883" ||
    message.includes(PLANNER_SHARES_TABLE) ||
    message.includes(GET_PLANNER_SHARE_FUNCTION) ||
    lowerMessage.includes("does not exist") ||
    lowerMessage.includes("not found")
  );
}

export async function loadPlannerDataForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      data: null,
      error: new Error("Supabase browser client is not configured."),
    };
  }

  const { data, error } = await supabase
    .from(PLANNER_DOCUMENTS_TABLE)
    .select("user_id, data, updated_at")
    .eq("user_id", userId)
    .maybeSingle<PlannerDocumentRow>();

  if (error) {
    return {
      data: null,
      error,
    };
  }

  if (!data) {
    return {
      data: null,
      error: null,
    };
  }

  return {
    data: parsePlannerDocumentData(data.data),
    error: null,
  };
}

export async function savePlannerDataForUser(
  userId: string,
  plannerData: PlannerData,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      error: new Error("Supabase browser client is not configured."),
    };
  }

  const { error } = await supabase.from(PLANNER_DOCUMENTS_TABLE).upsert(
    {
      user_id: userId,
      data: plannerData,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  return {
    error,
  };
}

export async function createPlannerShareSnapshot(
  userId: string,
  plannerData: PlannerData,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      data: null,
      error: new Error("Supabase browser client is not configured."),
    };
  }

  const { data, error } = await supabase
    .from(PLANNER_SHARES_TABLE)
    .insert({
      owner_user_id: userId,
      snapshot: plannerData,
    })
    .select("id, snapshot, created_at, updated_at")
    .single<PlannerShareRow>();

  if (error) {
    return {
      data: null,
      error,
    };
  }

  return {
    data: parsePlannerShareSnapshot(data),
    error: null,
  };
}

export async function loadPlannerShareSnapshot(shareId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return {
      data: null,
      error: new Error("Supabase browser client is not configured."),
    };
  }

  const { data, error } = await supabase.rpc(GET_PLANNER_SHARE_FUNCTION, {
    share_id: shareId,
  });

  if (error) {
    return {
      data: null,
      error,
    };
  }

  if (!data || typeof data !== "object") {
    return {
      data: null,
      error: null,
    };
  }

  return {
    data: parsePlannerShareSnapshot(data as PlannerShareRow),
    error: null,
  };
}
