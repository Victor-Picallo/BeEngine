import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Category } from '../../../data/sports.data';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class TopbarComponent {
  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();

  catChange = output<string>();
}
