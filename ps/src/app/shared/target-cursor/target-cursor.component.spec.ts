import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetCursorComponent } from './target-cursor.component';

describe('TargetCursorComponent', () => {
  let component: TargetCursorComponent;
  let fixture: ComponentFixture<TargetCursorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TargetCursorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TargetCursorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
