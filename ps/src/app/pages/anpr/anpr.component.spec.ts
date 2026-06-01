import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ANPRComponent } from './anpr.component';

describe('ANPRComponent', () => {
  let component: ANPRComponent;
  let fixture: ComponentFixture<ANPRComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ANPRComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ANPRComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
