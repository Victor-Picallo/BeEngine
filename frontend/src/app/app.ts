import { Component } from '@angular/core';
import { HomeComponent } from './features/home/home.component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent],
  template: '<app-home></app-home>',
})
export class App {}
