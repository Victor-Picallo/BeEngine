import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, Router } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        /** Evita saltar arriba al cambiar solo query params; la paginación usa replaceState. */
        scrollPositionRestoration: 'disabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (auth: AuthService, router: Router) => async () => {
        await auth.init();
        if (!auth.session() || auth.isPasswordRecovery()) return;
        await auth.refreshProfile();
        auth.clearOAuthHashFromUrl();
        if (!auth.needsOnboarding()) return;
        const path = router.url.split('?')[0] ?? '';
        if (path === '/login') return;
        await router.navigate(['/login'], { queryParams: { tab: 'onboarding' } });
      },
      deps: [AuthService, Router],
    },
  ],
};
