/** Utility to monitor application for degraded performance */
export default class PerformanceMonitor {
  taskTimings = []

  /** Instantiate new performance monitor */
  constructor(threshold = 300) {
    this.observer = new PerformanceObserver((obs) => this.addObservations(obs, threshold));
  }

  /** Check if the performance is degraded */
  get isPerformanceDegraded() {
    return this.taskTimings.length > 0;
  }

  /** Add new observations to task timings */
  addObservations(observations, threshold) {
    const perfEntries = observations.getEntriesByType('longtask');
    for (let i = 0; i < perfEntries.length; i += 1) {
      const entry = perfEntries[i];
      if (entry.duration >= threshold) {
        this.taskTimings.push(entry.duration);
      }
    }
  }

  /** Start performance monitoring */
  start() {
    this.taskTimings = [];
    this.observer.observe({ entryTypes: ['longtask'] });
  }

  /** Stop performance monitoring */
  stop() {
    this.observer.disconnect();
  }
}
