import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Category } from '../../../data/sports.data';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink],
})
export class TopbarComponent {
  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();

  catChange = output<string>();
}
