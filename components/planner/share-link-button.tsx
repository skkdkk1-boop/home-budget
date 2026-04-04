"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  createPlannerShareSnapshot,
  isMissingPlannerSharesSetupError,
} from "@/lib/planner-supabase";

import { usePlannerAuth } from "./auth-provider";
import { usePlannerData } from "./planner-provider";
import { Button, FormDialog, SummaryChip, TextInput } from "./ui";

export function ShareLinkButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isReady: isAuthReady, user } = usePlannerAuth();
  const { data, isReady: isPlannerReady } = usePlannerData();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const canCreate = Boolean(user && isAuthReady && isPlannerReady && !isSubmitting);
  const hasShareLink = shareUrl.length > 0;

  function resetDialog() {
    setOpen(false);
    setShareUrl("");
    setIsSubmitting(false);
  }

  async function handleCreateShare() {
    if (!user) {
      window.alert("공유 링크를 만들려면 먼저 로그인해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createPlannerShareSnapshot(user.id, data);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error("공유 링크를 만들지 못했어요.");
      }

      const sharePath = pathname === "/" ? "" : pathname;
      const queryString = searchParams.toString();

      setShareUrl(
        `${window.location.origin}/share/${result.data.id}${sharePath}${
          queryString ? `?${queryString}` : ""
        }`,
      );
    } catch (error) {
      console.error(error);

      if (isMissingPlannerSharesSetupError(error)) {
        window.alert(
          "공유 기능을 쓰려면 Supabase SQL Editor에서 planner_shares.sql을 먼저 실행해주세요.",
        );
      } else {
        window.alert("공유 링크를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      resetDialog();
    } catch (error) {
      console.error(error);
      window.prompt("아래 링크를 복사해주세요.", shareUrl);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        공유
      </Button>

      <FormDialog
        open={open}
        title="읽기 전용 공유 링크"
        description="현재 보고 있는 페이지와 탭, 필터 상태를 읽기 전용 스냅샷으로 만들어 다른 사람에게 보낼 수 있어요."
        onClose={resetDialog}
        mobilePosition="center"
        panelClassName="max-w-xl"
      >
        <div className="space-y-4">
          <div className="planner-panel-muted space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <SummaryChip tone="highlight">읽기 전용</SummaryChip>
              <SummaryChip>로그인 없이 열람 가능</SummaryChip>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              링크를 만들 때의 데이터를 그대로 복사합니다. 이후 앱에서 수정한 내용은
              기존 공유 링크에 자동 반영되지 않아요.
            </p>
          </div>

          {hasShareLink ? (
            <div className="space-y-3">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[var(--text-label)]">
                  공유 링크
                </span>
                <TextInput readOnly value={shareUrl} />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={handleCreateShare} disabled={isSubmitting}>
                  새 링크 만들기
                </Button>
                <Button variant="primary" onClick={() => void handleCopyShareUrl()}>
                  링크 복사
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={resetDialog}>
                닫기
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleCreateShare()}
                disabled={!canCreate}
              >
                {isSubmitting ? "링크 생성 중" : "현재 내용으로 링크 만들기"}
              </Button>
            </div>
          )}
        </div>
      </FormDialog>
    </>
  );
}
