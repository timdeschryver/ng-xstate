import { Injectable, OnDestroy } from '@angular/core';
import { fromEventPattern, Subject, Observable } from 'rxjs';
import {
  Machine,
  assign,
  MachineConfig,
  StateMachine,
  interpret,
  State,
  MachineOptions,
} from 'xstate';
import { Interpreter, StateListener } from 'xstate/lib/interpreter';
import {
  takeUntil,
  tap,
  map,
  refCount,
  publishReplay,
  startWith,
} from 'rxjs/operators';

@Injectable()
export class SignUpMachine implements OnDestroy {
  private destroy = new Subject();
  private service: Interpreter<SignUpContext, SignUpSchema, SignUpEvent>;
  private machine: StateMachine<SignUpContext, SignUpSchema, SignUpEvent>;

  state: Observable<State<SignUpContext, SignUpEvent> | {}>;

  interpretMachine(
    options: MachineOptions<SignUpContext, SignUpEvent>,
    context?: SignUpContext | undefined,
  ) {
    this.machine = signUpMachine.withConfig(options, context);
    this.service = interpret(this.machine);

    this.state = fromEventPattern<
      [State<SignUpContext, SignUpEvent>, SignUpEvent]
    >((callback: StateListener<SignUpContext, SignUpEvent>) =>
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

  send(event: SignUpEvent) {
    this.service.send(event);
  }
}

const config: MachineConfig<SignUpContext, SignUpSchema, SignUpEvent> = {
  key: 'signUp',
  initial: 'idle',
  context: {
    username: '',
    password: '',
  },
  type: 'parallel',
  states: {
    idle: {},
    username: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            '': {
              target: 'uniquePending',
              cond: ctx => Boolean(ctx && ctx.username),
            },
          },
        },
        editing: {},
        valid: {},
        uniquePending: {
          on: {
            UNIQUE_SUCCESS: 'valid',
            UNIQUE_FAILURE: 'taken',
          },
        },
        taken: {},
        required: {},
      },
      on: {
        SET_USERNAME: [
          {
            target: '.required',
            cond: (_, event: SetUsername) =>
              event.payload.username.length === 0,
          },
          {
            target: '.uniquePending',
            actions: assign<SignUpContext, SetUsername>({
              username: (_, event) => event.payload.username,
            }),
          },
        ],
        USERNAME_EDITING: '.editing',
        USERNAME_FOCUS: { actions: ['usernameFocus'] },
      },
    },
    password: {
      initial: 'idle',
      states: {
        idle: {},
        editing: {},
        valid: {},
        invalid: {},
        required: {},
      },
      on: {
        SET_PASSWORD: [
          {
            cond: (_, event: SetPassword) =>
              event.payload.password.length === 0,
            target: '.required',
          },
          {
            cond: (_, event: SetPassword) => event.payload.password.length < 8,
            target: '.invalid',
          },
          {
            target: '.valid',
            actions: assign<SignUpContext, SetPassword>({
              password: (_, event) => event.payload.password,
            }),
          },
        ],
        PASSWORD_EDITING: '.editing',
        PASSWORD_FOCUS: { actions: ['passwordFocus'] },
      },
    },
  },
};

const signUpMachine = Machine(config);

export type SignUpState = State<SignUpContext, SignUpEvent>;

export type SignUpEvent =
  | SetUsername
  | UniqueSuccess
  | UniqueFailure
  | UsernameEditing
  | UsernameFocus
  | SetPassword
  | PasswordEditing
  | PasswordFocus;

export interface SignUpContext {
  username: string;
  password: string;
}

export interface SignUpSchema {
  states: {
    idle: {};
    username: {
      states: {
        idle: {};
        editing: {};
        valid: {};
        uniquePending: {};
        taken: {};
        required: {};
      };
    };
    password: {
      states: {
        idle: {};
        editing: {};
        valid: {};
        invalid: {};
        required: {};
      };
    };
  };
}

export interface SetUsername {
  type: 'SET_USERNAME';
  payload: { username: string };
}

export interface UniqueSuccess {
  type: 'UNIQUE_SUCCESS';
}

export interface UniqueFailure {
  type: 'UNIQUE_FAILURE';
}

export interface UsernameEditing {
  type: 'USERNAME_EDITING';
}

export interface UsernameFocus {
  type: 'USERNAME_FOCUS';
}

export interface SetPassword {
  type: 'SET_PASSWORD';
  payload: { password: string };
}

export interface PasswordEditing {
  type: 'PASSWORD_EDITING';
}

export interface PasswordFocus {
  type: 'PASSWORD_FOCUS';
}
