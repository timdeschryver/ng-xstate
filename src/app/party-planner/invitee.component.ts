import { Component, OnInit } from '@angular/core';
import { InviteeMachine } from './inviteeMachine';

@Component({
  selector: 'app-invitee',
  template: `
    <div *ngIf="(machine.state | async) as state" [ngSwitch]="state.value">
      <input
        type="text"
        *ngSwitchCase="'adding'"
        (keydown.enter)="add($event)"
      />

      <p *ngSwitchCase="'accepted'" style="font-weight:bold">
        {{ state.context.invitee }}
      </p>

      <p *ngSwitchCase="'declined'" style="text-decoration: line-through">
        {{ state.context.invitee }}
      </p>

      <p *ngSwitchDefault>
        <button (click)="accept()">V</button>
        <button (click)="decline()">X</button>
        <span>{{ state.context.invitee }}</span>
      </p>

      <small>{{ state.value }}</small>
    </div>
  `,
  providers: [InviteeMachine],
})
export class InviteeComponent implements OnInit {
  constructor(public machine: InviteeMachine) {}

  ngOnInit() {
    this.machine.interpretMachine({});
  }

  add(event: any) {
    this.machine.send({
      type: 'ADD',
      payload: {
        invitee: event.target.value,
      },
    });
  }

  accept() {
    this.machine.send({ type: 'ACCEPT' });
  }

  decline() {
    this.machine.send({ type: 'DECLINE' });
  }
}
