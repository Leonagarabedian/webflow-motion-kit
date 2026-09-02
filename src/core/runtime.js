function findMatches(root, selector) {
  const matches = [];
  if (root instanceof Element && root.matches(selector)) matches.push(root);
  matches.push(...root.querySelectorAll(selector));
  return matches;
}

function normalizeCleanup(result) {
  if (typeof result === "function") return result;
  if (result && typeof result.destroy === "function") {
    return () => result.destroy();
  }
  return () => {};
}

export function createRuntime({ modules, services }) {
  const mountedByElement = new WeakMap();
  const records = new Set();

  function init(root = document) {
    for (const module of modules) {
      for (const element of findMatches(root, module.selector)) {
        let mounted = mountedByElement.get(element);
        if (!mounted) {
          mounted = new Map();
          mountedByElement.set(element, mounted);
        }
        if (mounted.has(module.name)) continue;

        try {
          const cleanup = normalizeCleanup(module.mount(element, services));
          const record = { cleanup, element, moduleName: module.name };
          mounted.set(module.name, record);
          records.add(record);
        } catch (error) {
          services.logger.error(`[MotionKit] ${module.name} failed`, element, error);
        }
      }
    }
    return api;
  }

  function destroy(root = document) {
    for (const record of [...records]) {
      const isInside =
        root === document || root === record.element || root.contains(record.element);
      if (!isInside) continue;

      try {
        record.cleanup();
      } catch (error) {
        services.logger.error(
          `[MotionKit] ${record.moduleName} cleanup failed`,
          record.element,
          error
        );
      }

      mountedByElement.get(record.element)?.delete(record.moduleName);
      records.delete(record);
    }
    return api;
  }

  function refresh() {
    services.ScrollTrigger.refresh();
    return api;
  }

  const api = {
    destroy,
    init,
    refresh,
    get mountedCount() {
      return records.size;
    }
  };

  return api;
}
