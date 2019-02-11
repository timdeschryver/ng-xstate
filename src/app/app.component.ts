import {
  Component,
  OnInit,
  Injectable,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {
  fromEventPattern,
  BehaviorSubject,
  of,
  fromEvent,
  Subject,
} from 'rxjs';
import {
  map,
  tap,
  debounceTime,
  switchMap,
  catchError,
  delay,
  takeUntil,
} from 'rxjs/operators';
import { Machine, MachineConfig, interpret, State, assign } from 'xstate';
import { StateListener, Interpreter } from 'xstate/lib/interpreter';

@Injectable()
export class UsernameService {
  private usernames = ['foo', 'bar', 'baz'];

  isUsernameUnique(username: string) {
    return of(this.usernames).pipe(
      delay(2_000),
      map(usernames => usernames.includes(username)),
    );
  }
}

@Component({
  selector: 'app-root',
  template: `
    <form *ngIf="(state | async) as s">
      <label for="username">Username</label>
      <input
        id="username"
        #username
        autocomplete="off"
        [style.border-color]="usernameBorderColor(s)"
      />

      <label for="password">Password</label>
      <input
        id="password"
        #password
        autocomplete="off"
        [style.border-color]="passwordBorderColor(s)"
      />
    </form>
  `,
  providers: [UsernameService],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('username') username: ElementRef;
  @ViewChild('password') password: ElementRef;

  state = new BehaviorSubject<State<SignUpContext, SignUpEvent> | {}>({});
  private service: Interpreter<SignUpContext, SignUpSchema, SignUpEvent>;
  private destroy = new Subject();

  constructor(private usernameService: UsernameService) {
    this.service = interpret(machine);
    fromEventPattern<[State<SignUpContext, SignUpEvent>, SignUpEvent]>(
      (callback: StateListener<SignUpContext, SignUpEvent>) => {
        this.service.onTransition(callback);
      },
    ).subscribe(([state, event]) => {
      this.state.next(state);
      console.log(event, state.value);
    });
  }

  ngOnInit() {
    this.service.start();

    // Via code:
    // this.service.send({ type: 'SET_USERNAME', payload: { username: 'FOOO' } });
    // this.service.send({
    //   type: 'SET_PASSWORD',
    //   payload: { password: '123456789' },
    // });
    // this.service.send({ type: 'UNIQUE_SUCCESS' });
    // this.service.send({ type: 'SET_USERNAME', payload: { username: 'FxOOO' } });
  }

  ngAfterViewInit() {
    fromEvent<any>(this.username.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.service.send({
            type: 'USERNAME_INPUT',
          }),
        ),
        debounceTime(447),
        tap(event => {
          this.service.send({
            type: 'SET_USERNAME',
            payload: { username: event.target.value },
          });
        }),
        switchMap(event =>
          this.usernameService.isUsernameUnique(event.target.value).pipe(
            map(isUnique => {
              if (isUnique) {
                this.service.send({
                  type: 'UNIQUE_SUCCESS',
                });
              } else {
                this.service.send({
                  type: 'UNIQUE_FAILURE',
                });
              }
              return event;
            }),
            catchError(_ => {
              this.service.send({
                type: 'UNIQUE_FAILURE',
              });
              return of(event);
            }),
          ),
        ),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});

    fromEvent<any>(this.password.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.service.send({
            type: 'PASSWORD_INPUT',
          }),
        ),
        debounceTime(200),
        tap(event => {
          this.service.send({
            type: 'SET_PASSWORD',
            payload: { password: event.target.value },
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  usernameBorderColor(state: State<SignUpContext, SignUpEvent>) {
    if (state.matches('username.invalid')) {
      return 'red';
    }
    if (state.matches('username.valid')) {
      return 'green';
    }
    if (state.matches('username.uniquePending')) {
      return 'orange';
    }
    if (state.matches('username.taken')) {
      return 'red';
    }
  }

  passwordBorderColor(state: State<SignUpContext, SignUpEvent>) {
    if (state.matches('password.invalid')) {
      return 'red';
    }
    if (state.matches('password.valid')) {
      return 'green';
    }
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
        editing: {};
        valid: {};
        uniquePending: {};
        taken: {};
      };
    };
    password: {
      states: {
        idle: {};
        editing: {};
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

interface UsernameInput {
  type: 'USERNAME_INPUT';
}

interface PasswordInput {
  type: 'PASSWORD_INPUT';
}

type SignUpEvent =
  | SetUsername
  | SetPassword
  | UniqueSuccess
  | UniqueFailure
  | UsernameInput
  | PasswordInput;

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
        editing: {},
        valid: {},
        uniquePending: {
          on: {
            UNIQUE_SUCCESS: 'valid',
            UNIQUE_FAILURE: 'taken',
          },
        },
        taken: {},
      },
      on: {
        SET_USERNAME: {
          target: '.uniquePending',
          actions: assign<SignUpContext, SetUsername>({
            username: (_, event) => event.payload.username,
          }),
        },
        USERNAME_INPUT: '.editing',
      },
    },
    password: {
      initial: 'idle',
      states: {
        idle: {},
        editing: {},
        valid: {},
        invalid: {},
      },
      on: {
        SET_PASSWORD: [
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
        PASSWORD_INPUT: '.editing',
      },
    },
  },
};

const machine = Machine(signUpMachineConfig, {
  // actions: {
  //   setPassword: assign<SignUpContext, SetPassword>({
  //     password: (_, event) => event.payload.password,
  //   }),
  //   setUsername: assign<SignUpContext, SetUsername>({
  //     username: (_, event) => event.payload.username,
  //   }),
  // },
  // guards: {
  //   passwordMeetsRequirements: (_, event: SetPassword) =>
  //     event.payload.password.length < 8,
  // },
});
