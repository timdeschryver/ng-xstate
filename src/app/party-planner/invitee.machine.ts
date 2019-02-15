import { Injectable, OnDestroy } from '@angular/core';
import { fromEventPattern, Observable, Subject } from 'rxjs';
import {
  map,
  publishReplay,
  refCount,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {
  assign,
  interpret,
  Machine,
  MachineConfig,
  MachineOptions,
  send,
  State,
  StateMachine,
  sendParent,
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
  id: 'invitee',
  initial: 'adding',
  context: {
    id: '',
    invitee: '',
  },
  states: {
    adding: {
      onEntry: ['adding'],
      onExit: ['inviteeAdded'],
      on: {
        ADD: {
          target: 'pending',
          cond: (_, { payload }: Add) => payload.invitee.trim().length > 0,
          actions: [
            assign<InviteeContext, Add>({
              invitee: (_, { payload }) => payload.invitee,
            }),
          ],
        },
      },
    },
    pending: {
      on: {
        ACCEPT: 'accepted',
        DECLINE: 'declined',
      },
    },
    accepted: {
      on: {
        DECLINE: 'declined',
      },
    },
    declined: {
      on: {
        ACCEPT: 'accepted',
      },
    },
  },
};

export const inviteeMachine = Machine(config);

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
  id: string;
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
