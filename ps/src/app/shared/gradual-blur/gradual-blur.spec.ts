import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradualBlur } from './gradual-blur';

describe('GradualBlur', () => {
  let component: GradualBlur;
  let fixture: ComponentFixture<GradualBlur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GradualBlur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradualBlur);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
