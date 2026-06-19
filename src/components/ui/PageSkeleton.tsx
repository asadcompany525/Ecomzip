// ============================================================
// PageSkeleton — Lazy-loaded pages ke liye loading placeholder
// PageSkeleton = storefront pages, AdminPageSkeleton = admin panel pages
// ============================================================

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 bg-muted/40 border-b animate-pulse" />
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="h-7 bg-muted/50 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 bg-muted/60 rounded-lg w-48" />
        <div className="h-8 bg-muted/40 rounded-lg w-24 ml-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="h-[1px] bg-border" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex gap-3 items-center">
          <div className="h-12 w-12 rounded-lg bg-muted/50 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/50 rounded w-3/4" />
            <div className="h-3 bg-muted/30 rounded w-1/2" />
          </div>
          <div className="h-8 w-20 bg-muted/40 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
