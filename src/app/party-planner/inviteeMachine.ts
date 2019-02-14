import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, fromEventPattern } from 'rxjs';
import {
  startWith,
  tap,
  map,
  publishReplay,
  refCount,
  takeUntil,
} from 'rxjs/operators';
import {
  State,
  MachineConfig,
  assign,
  StateMachine,
  MachineOptions,
  interpret,
  Machine,
} from 'xstate';
import { Interpreter, StateListener } from 'xstate/lib/interpreter';

@Injectable()
export class InviteeMachine implements OnDestroy {
  private destroy = new Subject();
  private service: Interpreter<InviteeContext, InviteeSchema, InviteeEvent>;
  private machine: StateMachine<InviteeContext, InviteeSchema, InviteeEvent>;

  state: Observable<InviteeState>;

  interpretMachine(
    options: MachineOptions<InviteeContext, InviteeEvent>,
    context?: InviteeContext | undefined,
  ) {
    this.machine = inviteeMachine.withConfig(options, context);
    this.service = interpret(this.machine);

    this.state = fromEventPattern<[InviteeState, InviteeEvent]>(
      (callback: StateListener<InviteeContext, InviteeEvent>) =>
        this.service.onTransition(callback),
    ).pipe(
      startWith([this.machine.initialState, {} as any]),
      tap(([state, event]) => console.log(event, state.context)),
      map(([state, _]) => state),
      publishReplay(1),
      refCount(),
      takeUntil(this.destroy),
    );

    this.service.start();
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  send(event: InviteeEvent) {
    this.service.send(event);
  }
}

const config: MachineConfig<InviteeContext, InviteeSchema, InviteeEvent> = {
  key: 'invitee',
  initial: 'adding',
  context: {
    invitee: '',
  },
  states: {
    adding: {
      on: {
        ADD: {
          target: 'pending',
          cond: (_, { payload }: Add) => payload.invitee.trim().length > 0,
          actions: assign<InviteeContext, Add>({
            invitee: (_, { payload }) => payload.invitee,
          }),
        },
      },
    },
    pending: {
      on: {
        ACCEPT: 'accepted',
        DECLINE: 'declined',
      },
    },
    accepted: {},
    declined: {},
  },
};
const inviteeMachine = Machine(config);

export type InviteeState = State<InviteeContext, InviteeEvent>;

export interface InviteeSchema {
  states: {
    adding: {};
    pending: {};
    accepted: {};
    declined: {};
  };
}

export interface InviteeContext {
  invitee: string;
}

export type InviteeEvent = Add | Accept | Decline;

export interface Add {
  type: 'ADD';
  payload: { invitee: string };
}

export interface Accept {
  type: 'ACCEPT';
}

export interface Decline {
  type: 'DECLINE';
}
