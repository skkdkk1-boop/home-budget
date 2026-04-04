"use client";

import type { PlannerData } from "@/lib/planner-types";
import { parseStoredPlannerData } from "@/lib/planner-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const PLANNER_DOCUMENTS_TABLE = "planner_documents";

interface PlannerDocumentRow {
  user_id: string;
  data: unknown;
  updated_at?: string;
}

function parsePlannerDocumentData(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return parseStoredPlannerData(JSON.stringify(value));
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
