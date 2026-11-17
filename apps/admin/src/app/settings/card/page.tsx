"use client";

import { Suspense } from "react";
import { FormSkeleton } from "../../../components/ui";
import { CardSettingsContent } from "./_tabs/card-settings-content";

export default function CardSettingsPage() {
  return (
    <Suspense fallback={<FormSkeleton rows={6} />}>
      <CardSettingsContent />
    </Suspense>
  );
}
