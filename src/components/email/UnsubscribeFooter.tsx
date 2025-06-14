
import React from "react";

export function UnsubscribeFooter({ unsubscribeUrl, email }: { unsubscribeUrl: string; email: string }) {
  return (
    <div className="pt-8 text-xs text-muted-foreground border-t mt-4">
      If you no longer wish to receive emails from Webinar Wise, you can{" "}
      <a href={unsubscribeUrl}
        className="underline text-blue-700"
        target="_blank" rel="noopener">
        manage your preferences or unsubscribe here
      </a>. Your preferences are managed securely for {email} and in compliance with privacy laws.
    </div>
  );
}
