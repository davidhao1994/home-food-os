export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
      <div className="w-full rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">You are offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Home Food OS cached pages are still available. Reconnect to sync live inventory and shopping updates.
        </p>
      </div>
    </main>
  );
}
