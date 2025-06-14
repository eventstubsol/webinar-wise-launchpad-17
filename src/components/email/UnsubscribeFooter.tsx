
import React from "react";

export function UnsubscribeFooter({ email }: { email: string }) {
  return (
    <div className="pt-8 text-xs text-muted-foreground border-t mt-4">
      If you no longer wish to receive emails from Webinar Wise, you can{" "}
      <a href={`${window.location.origin}/unsubscribe?email=${encodeURIComponent(email)}`}
        className="underline text-blue-700"
        target="_blank" rel="noopener">
        unsubscribe here
      </a>. Your preferences are managed securely and in compliance with privacy laws.
    </div>
  );
}
