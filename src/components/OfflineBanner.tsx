interface OfflineBannerProps {
  online: boolean;
}

/** Shown when the device goes offline — the editor still works; only the
 * AI assistant (which needs the cloud) is unavailable. */
export function OfflineBanner({ online }: OfflineBannerProps) {
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      You are offline. The editor still works, but the AI assistant is unavailable until you
      reconnect.
    </div>
  );
}
