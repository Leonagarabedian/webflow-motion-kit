export function createAlignmentDiagnostics({ logger = console } = {}) {
  const records = new Map();

  function record(id, data) {
    if (!id) return;
    records.set(id, { ...data, timestamp: performance.now() });
  }

  function remove(id) {
    records.delete(id);
  }

  function get(id) {
    return records.get(id) ?? null;
  }

  function list() {
    return [...records.entries()].map(([id, data]) => ({ id, ...data }));
  }

  function log(id) {
    const data = get(id);
    if (data) logger.info(`[MotionKit] alignment:${id}`, data);
    return data;
  }

  function clear() {
    records.clear();
  }

  return { record, remove, get, list, log, clear };
}
