import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopbarComponent } from '../topbar/topbar.component';
import { HomeService } from '../../../features/home/services/home.service';
import type { Category } from '../../../data/sports.data';

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'f1',     label: 'Formula 1', short: 'F1',     accent: '#FFD100' },
  { id: 'motogp', label: 'MotoGP',    short: 'MotoGP', accent: '#FFD100' },
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TopbarComponent],
  template: `
    <app-topbar
      [categories]="categories()"
      [activeCat]="activeCat()"
      [accent]="accent()"
      (catChange)="onCatChange($event)">
    </app-topbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly router      = inject(Router);

  categories = signal<Category[]>(FALLBACK_CATEGORIES);
  activeCat  = signal('f1');

  currentCat = computed(
    () => this.categories().find(c => c.id === this.activeCat()) ?? this.categories()[0],
  );
  accent = computed(() => this.currentCat()?.accent ?? '#FFD100');

  ngOnInit(): void {
    this.homeService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cats => { if (cats?.length) this.categories.set(cats); },
        error: () => {},
      });
  }

  onCatChange(id: string): void {
    this.activeCat.set(id);
    // Other categories don't have implemented pages yet — return to home where
    // the category-aware dashboard lives.
    if (id !== 'f1') {
      this.router.navigate(['/']);
    }
  }
}
