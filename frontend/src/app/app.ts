import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';

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
    return !path.startsWith('/login');
  }
}
