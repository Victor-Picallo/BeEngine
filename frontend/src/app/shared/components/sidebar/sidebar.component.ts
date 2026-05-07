import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Category, Favorite } from '../../../data/sports.data';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class SidebarComponent {
  categories = input.required<Category[]>();
  activeCat  = input.required<string>();
  accent     = input.required<string>();
  favorites  = input.required<Favorite[]>();
  sections   = input.required<string[]>();

  catChange = output<string>();
}
