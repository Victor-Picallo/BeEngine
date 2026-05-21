import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { SeriesContextService } from '../../../core/series/series-context.service';
import {
  Constructor,
  Driver,
  LastRace,
  NewsItem,
  NextRace,
} from '../../../data/sports.data';
import { NewsImageComponent } from '../../../features/news/news-image/news-image.component';

interface QuickLink {
  label: string;
  desc: string;
  route: (string | number)[];
}

function truncate(text: string, max = 52): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

@Component({
  selector: 'app-right-rail',
  templateUrl: './right-rail.component.html',
  styleUrl: './right-rail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReturnNavDirective, NewsImageComponent],
})
export class RightRailComponent {
  private readonly series = inject(SeriesContextService);

  nextRace = input.required<NextRace>();
  standings = input.required<Driver[]>();
  constructors = input<Constructor[]>([]);
  lastRace = input.required<LastRace>();
  news = input.required<NewsItem[]>();
  activeCat = input.required<string>();
  accent = input.required<string>();
  lastRaceWinner = input('—');

  quickLinks = computed((): QuickLink[] => {
    const lr = this.lastRace();
    const leader = this.standings()[0];
    const topTeam = this.constructors()[0];
    const latest = this.news()[0];
    const p = this.series.path.bind(this.series);

    const links: QuickLink[] = [];

    if (lr.slug && lr.name !== '—') {
      if (this.series.config().features.raceSessionPage) {
        links.push({
          label: 'Última carrera',
          desc: lr.name,
          route: p('calendario', lr.slug, 'race'),
        });
      } else {
        links.push({
          label: 'Última carrera',
          desc: lr.name,
          route: p('calendario', lr.slug, 'race'),
        });
      }
    } else {
      links.push({
        label: 'Última carrera',
        desc: 'Calendario',
        route: p('calendario'),
      });
    }

    if (leader?.driverId) {
      links.push({
        label: 'Piloto líder',
        desc: `${leader.driver} · ${leader.points} pts`,
        route: p('pilotos', leader.driverId),
      });
    } else if (leader) {
      links.push({
        label: 'Piloto líder',
        desc: `${leader.driver} · ${leader.points} pts`,
        route: p('pilotos'),
      });
    } else {
      links.push({
        label: 'Piloto líder',
        desc: 'Clasificación pilotos',
        route: p('clasificacion'),
      });
    }

    if (topTeam?.constructorId) {
      links.push({
        label: 'Equipo líder',
        desc: `${topTeam.team} · ${topTeam.points} pts`,
        route: p('escuderias', topTeam.constructorId),
      });
    } else if (topTeam) {
      links.push({
        label: 'Equipo líder',
        desc: `${topTeam.team} · ${topTeam.points} pts`,
        route: p('escuderias'),
      });
    } else {
      links.push({
        label: 'Equipo líder',
        desc: 'Clasificación constructores',
        route: p('clasificacion'),
      });
    }

    if (latest?.id) {
      links.push({
        label: 'Última noticia',
        desc: truncate(latest.title),
        route: p('noticias', latest.id),
      });
    } else {
      links.push({
        label: 'Última noticia',
        desc: 'Feed de noticias',
        route: p('noticias'),
      });
    }

    return links;
  });

  newsListLink(): (string | number)[] {
    return this.series.path('noticias');
  }

  newsArticleLink(id: string): (string | number)[] {
    return this.series.path('noticias', id);
  }

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
