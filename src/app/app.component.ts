import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h3>Init form</h3>
    <app-sign-up-form></app-sign-up-form>

    <hr />

    <h3>Prefilled form</h3>
    <app-sign-up-form username="foo"></app-sign-up-form>
  `,
})
export class AppComponent {}
