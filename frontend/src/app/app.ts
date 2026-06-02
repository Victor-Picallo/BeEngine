import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';
import { F1LiveService } from './features/f1-live/f1-live.service';
import { MotogpPulseService } from './features/motogp/motogp-pulse.service';
import { Moto2LiveService } from './features/moto2/moto2-live.service';
import { Moto3LiveService } from './features/moto3/moto3-live.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AiChatWidgetComponent],
  template: `
    <router-outlet />
    @if (showAssist()) {
      <app-ai-chat-widget />
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  constructor() {
    inject(F1LiveService).invalidateStandingsCache();
    inject(MotogpPulseService).invalidateCache();
    inject(Moto2LiveService).invalidateCache();
    inject(Moto3LiveService).invalidateCache();
  }

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  showAssist(): boolean {
    const path = (this.url() ?? '').split('?')[0];
    return path !== '/' && !path.startsWith('/login');
  }
}
