import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PartyPlannerMachine, Invitee } from './party-planner.machine';

@Component({
  selector: 'app-party-planner',
  template: `
    <div *ngIf="(machine.state | async) as state">
      <app-invitee
        *ngFor="let invitee of state.context.invitees; trackBy: trackByInvitee"
        [invitee]="invitee"
        (update)="updateInvitee($event, invitee.id)"
      ></app-invitee>

      <button (click)="addInvitee()" *ngIf="state.value === 'idle'">
        Add invitee
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PartyPlannerMachine],
})
export class PartyPlannerComponent implements OnInit {
  constructor(public machine: PartyPlannerMachine) {}

  ngOnInit() {
    this.machine.interpretMachine({});
  }

  addInvitee() {
    this.machine.send({
      type: 'NEW_INVITEE',
      payload: {
        id: Date.now().toString(),
        invitee: '',
      },
    });
  }

  updateInvitee(invitee: string, id: string) {
    this.machine.send({
      type: 'INVITEE.UPDATED',
      payload: {
        id,
        invitee,
      },
    });
  }

  trackByInvitee(_, invitee: Invitee) {
    return invitee.id;
  }
}
