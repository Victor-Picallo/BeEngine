import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Constructor, Driver, NewsItem, NextRace } from '../../../data/sports.data';
import { NewsImageComponent } from '../../../features/news/news-image/news-image.component';

interface QuickLink {
  label: string;
  desc: string;
  route: string;
}

@Component({
  selector: 'app-right-rail',
  templateUrl: './right-rail.component.html',
  styleUrl: './right-rail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NewsImageComponent],
})
export class RightRailComponent {
  nextRace      = input.required<NextRace>();
  standings     = input.required<Driver[]>();
  constructors  = input<Constructor[]>([]);
  news          = input.required<NewsItem[]>();
  activeCat     = input.required<string>();
  accent        = input.required<string>();
  lastRaceWinner = input('—');

  quickLinks: QuickLink[] = [
    { label: 'Calendario', desc: 'Todas las rondas', route: '/f1/calendario' },
    { label: 'Pilotos', desc: 'Fichas y stats', route: '/f1/pilotos' },
    { label: 'Equipos', desc: 'Escuderías 2026', route: '/f1/escuderias' },
    { label: 'Noticias', desc: 'Últimas noticias', route: '/noticias' },
  ];

  quickStats = computed(() => {
    const r = this.nextRace();
    const s = this.standings();
    return [
      { label: 'Rondas completadas', val: `${Math.max(0, r.round - 1)}/${r.totalRounds}` },
      { label: 'Líder mundial', val: s[0]?.driver ?? '—' },
      {
        label: 'Diferencia 1º-2º',
        val: s.length >= 2 ? `${s[0].points - s[1].points} pts` : '—',
      },
      { label: 'Constructor líder', val: this.constructors()[0]?.team ?? '—' },
      { label: 'Último ganador', val: this.lastRaceWinner() },
    ];
  });

  trendingNews = computed(() => this.news().slice(0, 3));
}
