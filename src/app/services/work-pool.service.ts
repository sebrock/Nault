import { Injectable } from '@angular/core';
import {PowService} from './pow.service';
import {NotificationService} from './notification.service';

@Injectable()
export class WorkPoolService {
  storeKey = `nanovault-workcache`;

  cacheLength = 25;
  workCache = [];

  constructor(private pow: PowService, private notifications: NotificationService) { }

  public workExists(hash) {
    return !!this.workCache.find(p => p.hash === hash);
  }

  // A simple helper, which doesn't wait for a response (Used for pre-loading work)
  public addWorkToCache(hash, multiplier= 1) {
    this.getWork(hash, multiplier);
  }

  // Remove a hash from from the cache
  public removeFromCache(hash) {
    const cachedIndex = this.workCache.findIndex(p => p.hash === hash);
    if (cachedIndex === -1) return;

    this.workCache.splice(cachedIndex, 1);
    this.saveWorkCache();
  }

  public clearCache() {
    this.workCache = [];
    this.saveWorkCache();

    return true;
  }

  public deleteCache() {
    this.workCache = [];
    localStorage.removeItem(this.storeKey);
  }

  // Get work for a hash.  Uses the cache, or the current setting for generating it.
  public async getWork(hash, multiplier= 1) {
    const cached = this.workCache.find(p => p.hash === hash);
    if (cached && cached.work) {
      console.log('Using cached work: ' + cached.work);
      return cached.work;
    }

    const work = await this.pow.getPow(hash, multiplier);
    if (!work) {
      this.notifications.sendWarning(`Failed to retrieve work for ${hash}.  Try a different PoW method.`);
      return null;
    }

    console.log('Work found: ' + work);
    this.workCache.push({ hash, work });
    if (this.workCache.length >= this.cacheLength) this.workCache.shift(); // Prune if we are at max length
    this.saveWorkCache();

    return work;
  }

  /**
   * Save the work cache to localStorage
   */
  private saveWorkCache() {
    // Remove duplicates
    this.workCache = this.workCache.reduce((previous, current) => {
      if (!previous.find(p => p.hash === current.hash)) previous.push(current);
      return previous;
    }, []);

    localStorage.setItem(this.storeKey, JSON.stringify(this.workCache));
  }

  /**
   * Load the work cache from localStorage
   */
  public loadWorkCache() {
    let workCache = [];
    const workCacheStore = localStorage.getItem(this.storeKey);
    if (workCacheStore) {
      workCache = JSON.parse(workCacheStore);
    }
    this.workCache = workCache;

    return this.workCache;
  }
}
