/**
 * Spike Detection Service
 * Evaluates whether an incoming view update exhibits an abnormal surge.
 * Default threshold: 500,000 views per single update or configured via SPIKE_THRESHOLD_PER_UPDATE.
 */
export class SpikeDetectionService {
  private static defaultThreshold = 500000;

  public static getThreshold(): number {
    const envVal = process.env.SPIKE_THRESHOLD_PER_UPDATE;
    if (envVal && !isNaN(Number(envVal))) {
      return Number(envVal);
    }
    return this.defaultThreshold;
  }

  /**
   * Evaluates if a view jump triggers a spike flag.
   *
   * @param currentViews Previously recorded views
   * @param newViews Incoming new view count
   * @param lastProcessedAt Optional last processed timestamp
   * @returns boolean indicating if view spike is detected
   */
  public static isSpike(
    currentViews: number,
    newViews: number,
    _lastProcessedAt?: Date,
  ): boolean {
    if (newViews <= currentViews) return false;
    const delta = newViews - currentViews;
    const threshold = this.getThreshold();
    return delta >= threshold;
  }
}
