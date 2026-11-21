// Small dependency-free LRU cache used to bound in-memory caches (live context,
// weather, news) so a long-running process cannot grow them without limit.
export class LruCache {
  constructor(maxEntries = 200) {
    this.maxEntries = Math.max(1, Number(maxEntries) || 200);
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // Re-insert to mark as most recently used.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
    return this;
  }

  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

export default LruCache;