import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AssistChatMessage,
  AssistChatResponse,
  AssistStatusResponse,
} from './assist.types';

@Injectable({ providedIn: 'root' })
export class AssistService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  readonly configured = signal(false);
  readonly statusChecked = signal(false);
  readonly statusError = signal<string | null>(null);

  async checkStatus(force = false): Promise<boolean> {
    if (this.statusChecked() && !force) {
      return this.configured();
    }
    this.statusError.set(null);
    try {
      const body = await firstValueFrom(
        this.http.get<{ success: boolean; data: AssistStatusResponse }>(
          `${this.apiBase}/assist/status`,
        ),
      );
      const ok = Boolean(body?.success && body.data?.configured);
      this.configured.set(ok);
      if (!ok) {
        this.statusError.set('Asistente no configurado en el servidor (GROQ_API_KEY o base de datos).');
      }
      return ok;
    } catch (err) {
      this.configured.set(false);
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.statusError.set(
          'El API no expone /assist. Reinicia el backend (npm run dev en backend/) con el código actual.',
        );
      } else if (err instanceof HttpErrorResponse && err.status === 0) {
        this.statusError.set('No hay conexión con el API en localhost:3000.');
      } else {
        this.statusError.set(null);
      }
      return false;
    } finally {
      this.statusChecked.set(true);
    }
  }

  async sendMessage(
    message: string,
    scope: string,
    history: AssistChatMessage[],
  ): Promise<AssistChatResponse> {
    const body = await firstValueFrom(
      this.http.post<{ success: boolean; data: AssistChatResponse }>(
        `${this.apiBase}/assist/chat`,
        { message, scope, history },
      ),
    );
    if (!body?.success || !body.data?.reply) {
      throw new Error('Respuesta inválida del asistente');
    }
    return body.data;
  }

  mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const msg = err.error?.error;
      if (typeof msg === 'string' && msg.trim()) return msg;
      if (err.status === 429) return 'Demasiadas preguntas. Espera un minuto.';
      if (err.status === 503) return 'Asistente no disponible en el servidor.';
    }
    return err instanceof Error ? err.message : 'Error de conexión con el asistente.';
  }
}
