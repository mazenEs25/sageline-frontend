import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat-card">
      <div class="stat-icon" [style.background]="color + '15'" [style.color]="color">
        <i [class]="icon"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: border-color 0.2s, transform 0.15s;
      height: 100%;
    }

    .stat-card:hover {
      border-color: #475569;
      transform: translateY(-1px);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon i {
      font-size: 1.3rem;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 700;
      color: #f1f5f9;
      font-family: 'DM Sans', sans-serif;
      line-height: 1.1;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      margin-top: 3px;
    }
  `]
})
export class StatCardComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() color = '#3b82f6';
}