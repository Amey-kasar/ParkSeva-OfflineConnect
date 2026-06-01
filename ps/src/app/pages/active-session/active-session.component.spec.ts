import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveSessionComponent } from './active-session.component';

describe('ActiveSessionComponent', () => {
  let component: ActiveSessionComponent;
  let fixture: ComponentFixture<ActiveSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveSessionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActiveSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
