import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MobileService {
  private isMobileSubject = new BehaviorSubject<boolean>(this.checkIsMobile());
  public isMobile$ = this.isMobileSubject.asObservable();

  constructor() {
    window.addEventListener('resize', () => {
      this.isMobileSubject.next(this.checkIsMobile());
    });
  }

  private checkIsMobile(): boolean {
    return window.innerWidth <= 768;
  }

  get isMobile(): boolean {
    return this.isMobileSubject.value;
  }

  get isTablet(): boolean {
    return window.innerWidth <= 1024 && window.innerWidth > 768;
  }

  get isDesktop(): boolean {
    return window.innerWidth > 1024;
  }
}