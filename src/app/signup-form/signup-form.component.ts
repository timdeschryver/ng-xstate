import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { of, fromEvent, Subject, NEVER } from 'rxjs';
import {
  map,
  tap,
  debounceTime,
  switchMap,
  catchError,
  takeUntil,
} from 'rxjs/operators';
import { UsernameService } from './services/username.service';
import { SignUpMachine, SignUpState } from './statemachine';

@Component({
  selector: 'app-sign-up-form',
  template: `
    <form *ngIf="(signup.state | async) as state">
      <label for="username">Username ({{ state.value.username }})</label>
      <input
        type="text"
        id="username"
        [value]="state.context.username"
        (focus)="signup.send({ type: 'USERNAME_FOCUS' })"
        #username
        autocomplete="off"
        [style.border-color]="usernameBorderColor(state)"
      />

      <label for="password">Password ({{ state.value.password }})</label>
      <input
        type="text"
        id="password"
        [value]="state.context.password"
        (focus)="signup.send({ type: 'PASSWORD_FOCUS' })"
        #password
        autocomplete="off"
        [style.border-color]="passwordBorderColor(state)"
      />
    </form>
  `,
  providers: [SignUpMachine, UsernameService],
})
export class SignUpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('username') usernameField: ElementRef;
  @ViewChild('password') passwordField: ElementRef;

  @Input() username = '';

  private destroy = new Subject();

  constructor(
    public signup: SignUpMachine,
    private usernameService: UsernameService,
  ) {}

  ngOnInit() {
    this.signup.interpretMachine(
      {
        actions: {
          usernameFocus: () => {
            this.usernameField.nativeElement.select();
          },
          passwordFocus: () => {
            this.passwordField.nativeElement.select();
          },
        },
      },
      {
        username: this.username,
        password: '',
      },
    );
  }

  ngAfterViewInit() {
    fromEvent<any>(this.usernameField.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.signup.send({
            type: 'USERNAME_EDITING',
          }),
        ),
        debounceTime(500),
        tap(event => {
          this.signup.send({
            type: 'SET_USERNAME',
            payload: { username: event.target.value },
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});

    fromEvent<any>(this.passwordField.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.signup.send({
            type: 'PASSWORD_EDITING',
          }),
        ),
        debounceTime(500),
        tap(event => {
          this.signup.send({
            type: 'SET_PASSWORD',
            payload: { password: event.target.value },
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});

    this.signup.state
      .pipe(
        switchMap((state: SignUpState) =>
          (state.value as any).username !== 'uniquePending'
            ? NEVER
            : this.usernameService
                .isUsernameUnique(state.context.username)
                .pipe(
                  map(isUnique => {
                    if (isUnique) {
                      this.signup.send({
                        type: 'UNIQUE_SUCCESS',
                      });
                    } else {
                      this.signup.send({
                        type: 'UNIQUE_FAILURE',
                      });
                    }
                    return state;
                  }),
                  catchError(_ => {
                    this.signup.send({
                      type: 'UNIQUE_FAILURE',
                    });
                    return of(state);
                  }),
                ),
        ),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  usernameBorderColor(state: SignUpState) {
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
    if (state.matches('username.required')) {
      return 'red';
    }
  }

  passwordBorderColor(state: SignUpState) {
    if (state.matches('password.invalid')) {
      return 'red';
    }
    if (state.matches('password.valid')) {
      return 'green';
    }
    if (state.matches('password.required')) {
      return 'red';
    }
  }
}
