"use client";

import { startTransition, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type QueryValue = string | null | undefined;

export function usePlannerQueryState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsString = searchParams.toString();

  const getValue = useCallback(
    <T extends string>(
      key: string,
      defaultValue: T,
      allowedValues?: readonly T[],
    ) => {
      const rawValue = searchParams.get(key);

      if (!rawValue) {
        return defaultValue;
      }

      if (allowedValues && !allowedValues.includes(rawValue as T)) {
        return defaultValue;
      }

      return rawValue as T;
    },
    [searchParams],
  );

  const setValues = useCallback(
    (
      updates: Record<string, QueryValue>,
      defaultValues: Record<string, string> = {},
    ) => {
      const nextParams = new URLSearchParams(paramsString);

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value == null ||
          value === "" ||
          (defaultValues[key] !== undefined && value === defaultValues[key])
        ) {
          nextParams.delete(key);
          return;
        }

        nextParams.set(key, value);
      });

      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    },
    [paramsString, pathname, router],
  );

  return {
    getValue,
    setValues,
  };
}
