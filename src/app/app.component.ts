import { Component, OnInit } from '@angular/core';
import { Machine, MachineConfig, interpret, State, assign } from 'xstate';
import { fromEventPattern, Observable } from 'rxjs';
import { StateListener, Interpreter } from 'xstate/lib/interpreter';

@Component({
  selector: 'app-root',
  template: `
    <form>
      <label for="username">Username</label>
      <input
        id="username"
        autocomplete="off"
        (blur)="setUsername($event.target.value)"
      />

      <label for="password">Password</label>
      <input
        id="password"
        autocomplete="off"
        (blur)="setPassword($event.target.value)"
      />
    </form>
  `,
})
export class AppComponent implements OnInit {
  state: Observable<[State<SignUpContext, SignUpEvent>, SignUpEvent]>;
  service: Interpreter<SignUpContext, SignUpSchema, SignUpEvent>;

  constructor() {
    const machine = Machine(signUpMachineConfig, {
      actions: {
        setPassword: assign<SignUpContext, SetPassword>({
          password: (_, event) => event.payload.password,
        }),
        setUsername: assign<SignUpContext, SetUsername>({
          username: (_, event) => event.payload.username,
        }),
      },
      guards: {
        passwordMeetsRequirements: (_, event: SetPassword) =>
          event.payload.password.length < 8,
      },
    });

    this.service = interpret(machine);
    this.service.start();

    this.state = fromEventPattern<
      [State<SignUpContext, SignUpEvent>, SignUpEvent]
    >((callback: StateListener<SignUpContext, SignUpEvent>) => {
      this.service.onTransition(callback);
    });
  }

  ngOnInit() {
    this.state.subscribe(([state, _]) => {
      console.log(state.value, state.context);
    });

    this.service.send({ type: 'SET_USERNAME', payload: { username: 'FOOO' } });
    this.service.send({
      type: 'SET_PASSWORD',
      payload: { password: '123456789' },
    });
    this.service.send({ type: 'UNIQUE_SUCCESS' });
  }

  setUsername(event) {
    this.service.send({
      type: 'SET_USERNAME',
      payload: { username: event },
    });
  }

  setPassword(event) {
    this.service.send({
      type: 'SET_PASSWORD',
      payload: { password: event },
    });
  }
}

interface SignUpContext {
  username: string;
  password: string;
}

interface SignUpSchema {
  states: {
    idle: {};
    username: {
      states: {
        idle: {};
        valid: {};
        invalid: {};
        uniquePending: {};
      };
    };
    password: {
      states: {
        idle: {};
        valid: {};
        invalid: {};
      };
    };
  };
}

interface SetUsername {
  type: 'SET_USERNAME';
  payload: { username: string };
}

interface SetPassword {
  type: 'SET_PASSWORD';
  payload: { password: string };
}

interface UniqueSuccess {
  type: 'UNIQUE_SUCCESS';
}

interface UniqueFailure {
  type: 'UNIQUE_FAILURE';
}

type SignUpEvent = SetUsername | SetPassword | UniqueSuccess | UniqueFailure;

const signUpMachineConfig: MachineConfig<
  SignUpContext,
  SignUpSchema,
  SignUpEvent
> = {
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
        idle: {},
        valid: {},
        invalid: {},
        uniquePending: {
          on: {
            UNIQUE_SUCCESS: 'valid',
            UNIQUE_FAILURE: 'invalid',
          },
        },
      },
      on: {
        SET_USERNAME: {
          actions: 'setUsername',
          target: '.uniquePending',
        },
      },
    },
    password: {
      initial: 'idle',
      states: {
        idle: {},
        valid: {},
        invalid: {},
      },
      on: {
        SET_PASSWORD: [
          {
            cond: 'passwordMeetsRequirements',
            target: '.invalid',
          },
          {
            actions: 'setPassword',
            target: '.valid',
          },
        ],
      },
    },
  },
};
