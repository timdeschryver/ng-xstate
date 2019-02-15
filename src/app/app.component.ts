import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h3>Party 1</h3>
    <app-party-planner></app-party-planner>
    <hr />

    <h3>Party 2</h3>
    <app-party-planner></app-party-planner>
    <hr />

    <h3>Party 3</h3>
    <app-party-planner></app-party-planner>
    <hr />
  `,
})
export class AppComponent {}
