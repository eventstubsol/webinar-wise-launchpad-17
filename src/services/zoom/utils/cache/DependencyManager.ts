
/**
 * Cache Dependency Tracking and Invalidation
 */

export class DependencyManager {
  private dependencyMap = new Map<string, Set<string>>();

  /**
   * Add dependencies for a cache key
   */
  addDependencies(key: string, dependencies: string[]): void {
    // Remove old dependencies first
    this.removeDependencies(key);
    
    // Add new dependencies
    dependencies.forEach(dep => {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set());
      }
      this.dependencyMap.get(dep)!.add(key);
    });
  }

  /**
   * Remove all dependencies for a cache key
   */
  removeDependencies(key: string): void {
    for (const [dep, keys] of this.dependencyMap.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencyMap.delete(dep);
      }
    }
  }

  /**
   * Get all cache keys that depend on a specific dependency
   */
  getDependentKeys(dependency: string): Set<string> | undefined {
    return this.dependencyMap.get(dependency);
  }

  /**
   * Clear all dependency mappings
   */
  clear(): void {
    this.dependencyMap.clear();
  }

  /**
   * Get all dependencies (for debugging)
   */
  getAllDependencies(): Map<string, Set<string>> {
    return new Map(this.dependencyMap);
  }
}
