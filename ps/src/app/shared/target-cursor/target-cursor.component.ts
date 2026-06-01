import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  Input
} from '@angular/core';
import { gsap } from 'gsap';

@Component({
  selector: 'app-target-cursor',
  standalone: true,
  templateUrl: './target-cursor.component.html',
  styleUrls: ['./target-cursor.component.css']
})
export class TargetCursorComponent implements AfterViewInit, OnDestroy {

  @Input() targetSelector = `
    button,
    a,
    [role="button"],
    [data-cursor-target]
  `;

  @Input() spinDuration = 2;
  @Input() hideDefaultCursor = true;
  @Input() hoverDuration = 0.2;

  @ViewChild('cursor', { static: true }) cursorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dot', { static: true }) dotRef!: ElementRef<HTMLDivElement>;

  private corners!: HTMLElement[];
  private spinTl!: gsap.core.Timeline;
  private activeTarget: Element | null = null;
  private targetCorners: { x: number; y: number }[] | null = null;
  private strength = { current: 0 };

  ngAfterViewInit() {
    if (this.isMobile()) return;

    if (this.hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    this.corners = Array.from(
      this.cursorRef.nativeElement.querySelectorAll('.target-cursor-corner')
    );

    gsap.set(this.cursorRef.nativeElement, {
      xPercent: -50,
      yPercent: -50
    });

    this.spinTl = gsap.timeline({ repeat: -1 })
      .to(this.cursorRef.nativeElement, {
        rotation: '+=360',
        duration: this.spinDuration,
        ease: 'none'
      });

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseover', this.onMouseOver);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseover', this.onMouseOver);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.spinTl?.kill();
    document.body.style.cursor = '';
  }

  // ================= EVENTS =================

  private onMouseMove = (e: MouseEvent) => {
    gsap.to(this.cursorRef.nativeElement, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.1,
      ease: 'power3.out'
    });
  };

  private onMouseDown = () => {
    gsap.to(this.dotRef.nativeElement, { scale: 0.7, duration: 0.2 });
    gsap.to(this.cursorRef.nativeElement, { scale: 0.9, duration: 0.2 });
  };

  private onMouseUp = () => {
    gsap.to(this.dotRef.nativeElement, { scale: 1, duration: 0.2 });
    gsap.to(this.cursorRef.nativeElement, { scale: 1, duration: 0.2 });
  };

  private onMouseOver = (e: MouseEvent) => {
    const target = (e.target as Element)?.closest(this.targetSelector);
    if (!target || target === this.activeTarget) return;

    this.activeTarget = target;
    this.spinTl.pause();
    gsap.set(this.cursorRef.nativeElement, { rotation: 0 });

    const rect = target.getBoundingClientRect();
    const bw = 3;
    const cs = 12;

    this.targetCorners = [
      { x: rect.left - bw, y: rect.top - bw },
      { x: rect.right + bw - cs, y: rect.top - bw },
      { x: rect.right + bw - cs, y: rect.bottom + bw - cs },
      { x: rect.left - bw, y: rect.bottom + bw - cs }
    ];

    gsap.to(this.strength, {
      current: 1,
      duration: this.hoverDuration,
      ease: 'power2.out',
      onUpdate: () => this.updateCorners()
    });

    target.addEventListener('mouseleave', this.onMouseLeave, { once: true });
  };

  private onMouseLeave = () => {
    gsap.to(this.strength, {
      current: 0,
      duration: 0.2,
      ease: 'power2.out'
    });

    this.resetCorners(); // 🔑 FIX

    this.activeTarget = null;
    this.spinTl.restart();
  };

  private updateCorners() {
    if (!this.targetCorners) return;

    const cx = gsap.getProperty(this.cursorRef.nativeElement, 'x') as number;
    const cy = gsap.getProperty(this.cursorRef.nativeElement, 'y') as number;

    this.corners.forEach((corner, i) => {
      gsap.to(corner, {
        x: (this.targetCorners![i].x - cx) * this.strength.current,
        y: (this.targetCorners![i].y - cy) * this.strength.current,
        duration: 0.1,
        ease: 'power2.out'
      });
    });
  }

  private resetCorners() {
    const cs = 12;
    const positions = [
      { x: -cs * 1.5, y: -cs * 1.5 },
      { x: cs * 0.5, y: -cs * 1.5 },
      { x: cs * 0.5, y: cs * 0.5 },
      { x: -cs * 1.5, y: cs * 0.5 }
    ];

    this.corners.forEach((corner, i) => {
      gsap.to(corner, {
        x: positions[i].x,
        y: positions[i].y,
        duration: 0.3,
        ease: 'power3.out'
      });
    });
  }

  private isMobile(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
