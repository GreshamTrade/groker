'use strict';
(() => {
  const KEY = 'groker.runs.v1';
  const MAX_RUNS = 20;
  const memory = new Map();
  const valid = job => job && /^[a-f0-9]{12}$/.test(job.id) && job.status === 'complete'
    && typeof job.url === 'string' && /^https?:\/\//.test(job.url) && job.report
    && typeof job.created_at === 'string' && Number.isFinite(Date.parse(job.created_at))
    && Array.isArray(job.report.findings) && job.report.counts;

  function stored() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value.filter(valid).slice(0, MAX_RUNS) : [];
    } catch { return []; }
  }
  function list() {
    const jobs = new Map(stored().map(job => [job.id, job]));
    memory.forEach((job, id) => jobs.set(id, job));
    return [...jobs.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, MAX_RUNS);
  }
  function save(job) {
    if (!valid(job)) throw new Error('The server returned an incomplete report.');
    memory.set(job.id, job);
    const jobs = list();
    // Drop the oldest entries if this browser has a smaller storage quota.
    while (jobs.length) {
      try {
        localStorage.setItem(KEY, JSON.stringify(jobs));
        memory.clear();
        return true;
      } catch { jobs.pop(); }
    }
    return false;
  }
  window.GrokerArchive = {list, get: id => list().find(job => job.id === id), save};
})();
