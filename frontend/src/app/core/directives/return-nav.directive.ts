import { Directive, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackNavigationService } from '../services/back-navigation.service';

/** Añade `returnUrl` al estado del enlace para que «Volver» regrese a esta página. */
@Directive({
  selector: '[routerLink][appReturnNav]',
  standalone: true,
})
export class ReturnNavDirective implements OnInit {
  private readonly routerLink = inject(RouterLink, { self: true });
  private readonly backNav = inject(BackNavigationService);

  ngOnInit(): void {
    this.routerLink.state = {
      ...(this.routerLink.state ?? {}),
      ...this.backNav.linkState(),
    };
  }
}
