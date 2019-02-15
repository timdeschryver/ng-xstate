import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { InviteeMachine, Add } from './invitee.machine';
import { Invitee } from './party-planner.machine';

@Component({
  selector: 'app-invitee',
  template: `
    <div *ngIf="(machine.state | async) as state" [ngSwitch]="state.value">
      <input
        type="text"
        *ngSwitchCase="'adding'"
        (keydown.enter)="add($event)"
        #input
      />

      <p *ngSwitchCase="'accepted'" style="font-weight:bold">
        <button (click)="decline()">X</button> {{ state.context.invitee }}
      </p>

      <p *ngSwitchCase="'declined'" style="text-decoration: line-through">
        <button (click)="accept()">V</button> {{ state.context.invitee }}
      </p>

      <p *ngSwitchDefault>
        <button (click)="accept()">V</button>
        <button (click)="decline()">X</button>
        <span>{{ state.context.invitee }}</span>
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [InviteeMachine],
})
export class InviteeComponent implements OnInit {
  @Input() invitee: Invitee;
  @Output() update = new EventEmitter<{ invitee: string; status: string }>();

  @ViewChild('input') input: ElementRef;

  constructor(public machine: InviteeMachine) {}

  ngOnInit() {
    this.machine.interpretMachine(
      {
        actions: {
          adding: () => {
            setTimeout(() => {
              this.input.nativeElement.focus();
            });
          },
          inviteeAdded: (ctx, { payload }: Add) =>
            this.update.emit({ invitee: payload.invitee, status: 'fooo' }),
        },
      },
      this.invitee,
    );
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
