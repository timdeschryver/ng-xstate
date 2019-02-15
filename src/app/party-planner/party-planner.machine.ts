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
  State,
  StateMachine,
} from 'xstate';
import { Interpreter, StateListener } from 'xstate/lib/interpreter';

@Injectable()
export class PartyPlannerMachine implements OnDestroy {
  private destroy = new Subject();
  private service: Interpreter<
    PartyPlannerContext,
    PartyPlannerSchema,
    PartyPlannerEvent
  >;
  private machine: StateMachine<
    PartyPlannerContext,
    PartyPlannerSchema,
    PartyPlannerEvent
  >;

  state: Observable<PartyPlannerState>;

  interpretMachine(
    options: MachineOptions<PartyPlannerContext, PartyPlannerEvent>,
    context?: PartyPlannerContext | undefined,
  ) {
    this.machine = partyPlannerMachine.withConfig(options, context);
    this.service = interpret(this.machine);

    this.state = fromEventPattern<[PartyPlannerState, PartyPlannerEvent]>(
      (callback: StateListener<PartyPlannerContext, PartyPlannerEvent>) =>
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

  send(event: PartyPlannerEvent) {
    this.service.send(event);
  }
}

const config: MachineConfig<
  PartyPlannerContext,
  PartyPlannerSchema,
  PartyPlannerEvent
> = {
  id: 'party-planner',
  initial: 'idle',
  context: {
    invitees: [],
  },
  states: {
    newInvitee: {
      on: {
        'INVITEE.UPDATED': {
          target: 'idle',
          actions: assign<PartyPlannerContext, InviteeUpdated>({
            invitees: (ctx, { payload }) =>
              ctx.invitees.map(p => (p.id === payload.id ? payload : p)),
          }),
        },
      },
    },
    idle: {
      on: {
        NEW_INVITEE: {
          target: 'newInvitee',
          actions: assign<PartyPlannerContext, NewInvitee>({
            invitees: (ctx, { payload }) => ctx.invitees.concat(payload),
          }),
        },
      },
    },
  },
};

export const partyPlannerMachine = Machine(config);

export type PartyPlannerState = State<PartyPlannerContext, PartyPlannerEvent>;

export interface PartyPlannerSchema {
  states: {
    idle: {};
    newInvitee: {};
  };
}

export interface PartyPlannerContext {
  invitees: Invitee[];
}

export type PartyPlannerEvent = NewInvitee | InviteeUpdated;

export interface NewInvitee {
  type: 'NEW_INVITEE';
  payload: Invitee;
}

export interface InviteeUpdated {
  type: 'INVITEE.UPDATED';
  payload: Invitee;
}

export interface Invitee {
  id: string;
  invitee: string;
}
