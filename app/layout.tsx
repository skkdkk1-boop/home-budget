import type { ReactNode } from "react";
import type { Metadata } from "next";

import { PlannerAppLayout } from "@/components/planner/app-layout";
import { PlannerProvider } from "@/components/planner/planner-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "정리 가계부",
  description: "집 준비를 위한 자금, 구매, 배송, 시공 관리 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <PlannerProvider>
          <PlannerAppLayout>{children}</PlannerAppLayout>
        </PlannerProvider>
      </body>
    </html>
  );
}
