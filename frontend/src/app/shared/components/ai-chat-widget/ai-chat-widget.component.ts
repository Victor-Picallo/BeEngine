import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AssistMarkdownPipe } from '../../pipes/assist-markdown.pipe';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AssistService } from '../../../core/assist/assist.service';
import type { AssistChatMessage, AssistSource } from '../../../core/assist/assist.types';
import { assistScopeFromUrl } from '../../../core/assist/assist-scope.util';

interface UiMessage extends AssistChatMessage {
  sources?: AssistSource[];
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [FormsModule, AssistMarkdownPipe],
  templateUrl: './ai-chat-widget.component.html',
  styleUrls: ['./ai-chat-widget.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatWidgetComponent implements OnInit {
  private readonly assist = inject(AssistService);
  private readonly router = inject(Router);

  private readonly messagesScroll = viewChild<ElementRef<HTMLElement>>('messagesScroll');
  private readonly messagesEnd = viewChild<ElementRef<HTMLElement>>('messagesEnd');

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<UiMessage[]>([]);
  readonly scope = signal('global');

  readonly configured = this.assist.configured;

  readonly hasMessages = computed(() => this.messages().length > 0);

  inputText = '';

  private readonly welcome: UiMessage = {
    role: 'assistant',
    content:
      'Hola, soy el asistente de BeEngine. Pregúntame cómo usar la app, dónde encontrar calendarios, clasificaciones o tus favoritos.',
  };

  constructor() {
    effect(() => {
      this.messages();
      this.loading();
      this.error();
      if (this.open()) {
        this.scheduleScrollToBottom();
      }
    });

    afterNextRender(() => {
      if (this.open()) this.scheduleScrollToBottom();
    });
  }

  ngOnInit(): void {
    void this.assist.checkStatus();
    this.scope.set(assistScopeFromUrl(this.router.url));
    this.messages.set([this.welcome]);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.scope.set(assistScopeFromUrl(e.urlAfterRedirects)));
  }

  toggle(): void {
    const willOpen = !this.open();
    this.open.set(willOpen);
    if (willOpen) {
      this.error.set(null);
      void this.assist.checkStatus(true);
      this.scheduleScrollToBottom();
    }
  }

  private scheduleScrollToBottom(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    });
  }

  private scrollToBottom(): void {
    const anchor = this.messagesEnd()?.nativeElement;
    const container = this.messagesScroll()?.nativeElement;
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    if (!this.configured()) {
      await this.assist.checkStatus(true);
    }
    if (!this.configured()) {
      this.error.set(
        this.assist.statusError() ??
          'El asistente no está disponible. Comprueba GROQ_API_KEY en el servidor.',
      );
      return;
    }

    this.error.set(null);
    this.inputText = '';
    const userMsg: UiMessage = { role: 'user', content: text };
    this.messages.update((list) => [...list, userMsg]);
    this.loading.set(true);
    this.scheduleScrollToBottom();

    const list = this.messages();
    const withoutWelcome =
      list.length && list[0].role === 'assistant' ? list.slice(1) : list;
    const history = withoutWelcome
      .slice(0, -1)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    try {
      const data = await this.assist.sendMessage(text, this.scope(), history);
      this.messages.update((list) => [
        ...list,
        { role: 'assistant', content: data.reply, sources: data.sources },
      ]);
    } catch (err) {
      this.error.set(this.assist.mapError(err));
    } finally {
      this.loading.set(false);
    }
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void this.send();
    }
  }
}
