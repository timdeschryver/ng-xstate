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

  state: Observable<SignUpState>;

  interpretMachine(
    options: MachineOptions<SignUpContext, SignUpEvent>,
    context?: SignUpContext | undefined,
  ) {
    this.machine = signUpMachine.withConfig(options, context);
    this.service = interpret(this.machine);

    this.state = fromEventPattern<[SignUpState, SignUpEvent]>(
      (callback: StateListener<SignUpContext, SignUpEvent>) =>
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
              cond: ctx => !!ctx && !!ctx.username,
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
            cond: (_, { payload }: SetUsername) => !payload.username.length,
            actions: assign<SignUpContext, SetUsername>({
              username: (_, { payload }) => payload.username,
            }),
          },
          {
            target: '.uniquePending',
            actions: assign<SignUpContext, SetUsername>({
              username: (_, { payload }) => payload.username,
            }),
          },
        ],
        USERNAME_EDITING: '.editing',
        USERNAME_FOCUS: { actions: ['usernameFocus'] },
        SUBMIT: [
          {
            in: '.valid',
          },
          { target: '.required', cond: ctx => !ctx.username.length },
          { in: '.editing', target: '.uniquePending' },
        ],
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
            cond: (_, { payload }: SetPassword) => !payload.password.length,
            target: '.required',
            actions: assign<SignUpContext, SetPassword>({
              password: (_, { payload }) => payload.password,
            }),
          },
          {
            cond: (_, { payload }: SetPassword) =>
              isInvalidPassword(payload.password),
            target: '.invalid',
            actions: assign<SignUpContext, SetPassword>({
              password: (_, { payload }) => payload.password,
            }),
          },
          {
            target: '.valid',
            actions: assign<SignUpContext, SetPassword>({
              password: (_, { payload }) => payload.password,
            }),
          },
        ],
        PASSWORD_EDITING: '.editing',
        PASSWORD_FOCUS: { actions: ['passwordFocus'] },
        SUBMIT: [
          {
            in: '.valid',
          },
          {
            cond: ctx => isInvalidPassword(ctx.password),
            target: '.invalid',
          },
        ],
      },
    },
    submit: {
      initial: 'disabled',
      states: {
        disabled: {
          on: {
            SUBMIT: {
              target: 'enabled',
              in: {
                username: 'valid',
                password: 'valid',
              },
            },
          },
        },
        enabled: {
          on: {
            SUBMIT_PENDING: 'pending',
          },
        },
        pending: {
          on: {
            SUBMIT_SUCCESS: 'success',
            SUBMIT_FAILURE: 'failure',
          },
        },
        success: {},
        failure: {},
      },
    },
  },
};

function isInvalidPassword(password: string) {
  return password.length < 8;
}

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
  | PasswordFocus
  | Submit
  | SubmitPending
  | SubmitSuccess
  | SubmitFailure;

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
    submit: {
      states: {
        disabled: {};
        enabled: {};
        pending: {};
        success: {};
        failure: {};
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

export interface Submit {
  type: 'SUBMIT';
}

export interface SubmitPending {
  type: 'SUBMIT_PENDING';
}

export interface SubmitSuccess {
  type: 'SUBMIT_SUCCESS';
}

export interface SubmitFailure {
  type: 'SUBMIT_FAILURE';
}
