'use strict';
// Einfache Token-Buckets pro Schlüssel (z. B. IP-Adresse)
class RateLimiter {
  // rate = Token pro Sekunde, burst = maximale Token
  constructor(rate, burst) {
    this.rate = rate;
    this.burst = burst;
    this.map = new Map();
    this.timer = setInterval(() => this.cleanup(), 60000);
    this.timer.unref();
  }
  take(key, cost = 1) {
    const now = Date.now();
    let b = this.map.get(key);
    if (!b) {
      b = { tokens: this.burst, last: now };
      this.map.set(key, b);
    }
    b.tokens = Math.min(this.burst, b.tokens + ((now - b.last) / 1000) * this.rate);
    b.last = now;
    if (b.tokens < cost) return false;
    b.tokens -= cost;
    return true;
  }
  cleanup() {
    const now = Date.now();
    for (const [k, b] of this.map) if (now - b.last > 600000) this.map.delete(k);
  }
}

// Bucket für eine einzelne Verbindung (ohne Map)
class Bucket {
  constructor(rate, burst) {
    this.rate = rate;
    this.burst = burst;
    this.tokens = burst;
    this.last = Date.now();
  }
  take(cost = 1) {
    const now = Date.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

module.exports = { RateLimiter, Bucket };
