import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { NewsItem } from '../../../data/sports.data';

@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
})
export class NewsListComponent {
  news   = input.required<NewsItem[]>();
  accent = input.required<string>();
}
