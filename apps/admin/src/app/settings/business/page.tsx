"use client";

import { Suspense } from "react";
import { FormSkeleton } from "../../../components/ui";
import { BusinessSettingsPanel } from "../../../components/business/business-panels";

export default function BusinessSettingsPage() {
  return (
    <Suspense fallback={<FormSkeleton rows={5} />}>
      <BusinessSettingsPanel />
    </Suspense>
  );
}
