import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild, ViewEncapsulation, } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { F1LiveService } from './f1-live.service';
import { findOfficialCircuit, projectCircuitCoords } from '../calendar/official-circuits';
import type { ConstructorStandingDisplay, DriverStandingDisplay, JolpikaCalendarRace, JolpikaConstructorStanding, JolpikaDriverStanding, JolpikaLastRace, OpenF1Driver, OpenF1Interval, OpenF1Lap, OpenF1Location, OpenF1Position, OpenF1RaceControl, OpenF1Session, OpenF1Stint, OpenF1TeamRadio, OpenF1Weather, RadioMessage, SectorColor, TimingDriver, TireType, } from './f1-live.types';

const SESSION_LABEL = 'QUALY_SPRINT';
const DURATION_MINUTES = 30; // Sprint Shootout total window (approx 30 minutes: SQ1 12 + SQ2 10 + SQ3 8)

// Reuse most logic from FP1/FP2 components; only elapsed lookup targets sprint-specific session names
@Component({
  selector: 'app-f1-qualy-sprint-page',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './f1-qualy-sprint.page.html',
  styleUrl: './f1-fp1.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class F1QualySprintPageComponent implements OnInit, OnDestroy {
  @ViewChild('mapCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  private readonly service    = inject(F1LiveService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone       = inject(NgZone);

  loading = signal(true);
  sessions = signal<OpenF1Session[]>([]);
  now = signal(new Date());

  // Minimal elapsedDisplay that prefers 'Sprint Shootout' sessionName
  elapsedDisplay = computed(() => {
    const sess = this.sessions().find(s => (s.sessionName || '').toLowerCase().includes('sprint'))
                ?? this.sessions().find(s => s.sessionName === 'Sprint Shootout');
    if (sess?.dateStart) {
      try {
        const start = new Date(sess.dateStart).getTime();
        const now = this.now().getTime();
        const durMs = DURATION_MINUTES * 60 * 1000;
        let elapsedMs = Math.max(0, now - start);
        if (elapsedMs > durMs) elapsedMs = durMs;
        const hrs = Math.floor(elapsedMs / 3600000);
        const mins = Math.floor((elapsedMs % 3600000) / 60000);
        const secs = Math.floor((elapsedMs % 60000) / 1000);
        return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      } catch {}
    }
    const h = Math.floor(DURATION_MINUTES / 60);
    const m = DURATION_MINUTES % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
  });

  ngOnInit(): void {
    this.service.getSessions().subscribe({ next: s => this.sessions.set(s), error: () => {} });
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(new Date()));
  }
  ngOnDestroy(): void {}
}
