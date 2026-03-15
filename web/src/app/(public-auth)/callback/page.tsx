import { Suspense } from "react";

import { CallbackContent } from "./callback-content";

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
