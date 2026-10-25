type CancelTransfer = (() => void) & { promote?: () => void };
/** One background transfer; a second slot is reserved for the photograph being viewed. */
export class OriginalQueue {
  pending: { url: string; priority: boolean }[] = [];
  active = new Map<string, { priority: boolean; cancel: CancelTransfer }>();
  ready = new Set<string>();
  private load: (url: string, priority: boolean, done: (ok: boolean) => void) => CancelTransfer;
  private notify: (url: string) => void;
  constructor(load: (url: string, priority: boolean, done: (ok: boolean) => void) => CancelTransfer, notify: (url: string) => void) { this.load = load; this.notify = notify; }
  request(url: string, priority = false) {
    if (!url) return;
    if (priority) {
      for (const job of this.pending) if (job.url !== url) job.priority = false;
      // A newly viewed photo supersedes the previous foreground transfer.
      for (const [previous, job] of this.active) if (job.priority && previous !== url) {
        this.active.delete(previous); job.cancel();
        if (!this.ready.has(previous) && !this.pending.some(p => p.url === previous)) this.pending.push({ url: previous, priority: false });
      }
    }
    if (this.ready.has(url)) { this.pump(); return; }
    const active = this.active.get(url);
    if (active) { active.priority ||= priority; if (priority) active.cancel.promote?.(); this.pump(); return; }
    const existing = this.pending.find(job => job.url === url);
    if (existing) { existing.priority ||= priority; } else this.pending.push({ url, priority });
    this.pending.sort((a, b) => Number(b.priority) - Number(a.priority));
    this.pump();
  }
  pump() {
    while (this.active.size < 2) {
      const index = this.pending.findIndex(job => job.priority || ![...this.active.values()].some(a => !a.priority));
      if (index < 0) return;
      const job = this.pending.splice(index, 1)[0];
      const entry: { priority: boolean; cancel: CancelTransfer } = { priority: job.priority, cancel: () => {} };
      this.active.set(job.url, entry);
      entry.cancel = this.load(job.url, job.priority, ok => {
        if (this.active.get(job.url) !== entry) return;
        this.active.delete(job.url);
        if (ok) { this.ready.add(job.url); this.notify(job.url); }
        this.pump();
      });
    }
  }
  cancelBackground() {
    this.pending = this.pending.filter(job => job.priority);
    for (const [url, job] of this.active) if (!job.priority) { this.active.delete(url); job.cancel(); }
    this.pump();
  }
}
