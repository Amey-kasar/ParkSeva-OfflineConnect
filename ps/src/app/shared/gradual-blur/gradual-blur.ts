import { Component, Input, OnInit, OnChanges, SimpleChanges, HostBinding, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gradual-blur',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gradual-blur.html',
  styleUrls: ['./gradual-blur.css']
})
export class GradualBlurComponent implements OnInit, OnChanges, OnDestroy {
  // --- Configuration Inputs ---
  @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  @Input() strength: number = 2;
  @Input() height: string = '6rem';
  @Input() width: string = '100%';
  @Input() divCount: number = 5;
  @Input() exponential: boolean = false;
  @Input() zIndex: number = 10; // Lowered default for Angular context
  @Input() duration: string = '0.3s';
  @Input() opacity: number = 1;
  @Input() curve: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out' = 'linear';
  @Input() target: 'parent' | 'page' = 'parent';
  @Input() responsive: boolean = false;
  
  // Responsive Inputs
  @Input() mobileHeight?: string;
  @Input() tabletHeight?: string;
  @Input() desktopHeight?: string;
  
  // --- Internal State ---
  layers: any[] = [];
  resizeObserver: ResizeObserver | null = null;
  currentHeight: string = '';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.currentHeight = this.height;
    this.calculateLayers();

    if (this.responsive) {
      this.initResponsiveObserver();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      this.calculateLayers();
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Calculates the stacked layers of blur to create the gradient effect.
   * This mimics the loop logic from the React component.
   */
  calculateLayers() {
    this.layers = [];
    const increment = 100 / this.divCount;
    const curveFunc = this.getCurveFunction(this.curve);
    
    // Determine gradient direction
    const directionMap: Record<string, string> = {
      top: 'to top',
      bottom: 'to bottom',
      left: 'to left',
      right: 'to right'
    };
    const direction = directionMap[this.position] || 'to bottom';

    for (let i = 1; i <= this.divCount; i++) {
      let progress = i / this.divCount;
      progress = curveFunc(progress);

      let blurValue: number;
      if (this.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * this.strength;
      } else {
        blurValue = 0.0625 * (progress * this.divCount + 1) * this.strength;
      }

      // Calculate Gradient Stop Points
      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      // Create Style Object for this layer
      this.layers.push({
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        webkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        webkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: this.opacity,
        zIndex: i // Stack them
      });
    }
  }

  /**
   * Helper to map curve names to math functions
   */
  private getCurveFunction(curveName: string): (p: number) => number {
    const curves: Record<string, (p: number) => number> = {
      linear: p => p,
      bezier: p => p * p * (3 - 2 * p),
      'ease-in': p => p * p,
      'ease-out': p => 1 - Math.pow(1 - p, 2),
      'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
    };
    return curves[curveName] || curves['linear'];
  }

  /**
   * Handles responsive height changes
   */
  private initResponsiveObserver() {
    if (typeof window === 'undefined') return;

    // Simple window resize listener (debounced slightly by nature of angular change detection)
    this.resizeObserver = new ResizeObserver(() => {
        this.updateResponsiveDimensions();
    });
    this.resizeObserver.observe(document.body);
  }

  private updateResponsiveDimensions() {
    const w = window.innerWidth;
    let newHeight = this.height;

    if (w <= 480 && this.mobileHeight) newHeight = this.mobileHeight;
    else if (w <= 768 && this.tabletHeight) newHeight = this.tabletHeight;
    else if (w <= 1024 && this.desktopHeight) newHeight = this.desktopHeight;

    if (newHeight !== this.currentHeight) {
      this.currentHeight = newHeight;
      // Trigger change detection implicitly
    }
  }
}