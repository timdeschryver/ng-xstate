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
  filter,
  exhaustMap,
} from 'rxjs/operators';
import { UsernameService } from './services/username.service';
import { SignUpMachine, SignUpState } from './statemachine';

@Component({
  selector: 'app-sign-up-form',
  template: `
    <ng-container *ngIf="(machine.state | async) as state">
      <div *ngIf="state.matches('submit.success'); else formInput">
        <h1>{{ state.context.username }} is created!</h1>
      </div>

      <ng-template #formInput>
        <form (ngSubmit)="onSubmit($event)">
          <label for="username">Username ({{ state.value.username }})</label>
          <input
            type="text"
            id="username"
            [value]="state.context.username"
            (focus)="machine.send({ type: 'USERNAME_FOCUS' })"
            #username
            autocomplete="off"
            [style.border-color]="usernameBorderColor(state)"
          />

          <label for="password">Password ({{ state.value.password }})</label>
          <input
            type="text"
            id="password"
            [value]="state.context.password"
            (focus)="machine.send({ type: 'PASSWORD_FOCUS' })"
            #password
            autocomplete="off"
            [style.border-color]="passwordBorderColor(state)"
          />

          <button type="submit" (click)="onSubmit($event)">
            {{ state.matches('submit.pending') ? 'PENDING ...' : 'SUBMIT' }}
          </button>
        </form>
      </ng-template>
    </ng-container>
  `,
  providers: [SignUpMachine, UsernameService],
})
export class SignUpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('username') usernameField: ElementRef;
  @ViewChild('password') passwordField: ElementRef;

  @Input() username = '';

  private destroy = new Subject();

  constructor(
    public machine: SignUpMachine,
    private usernameService: UsernameService,
  ) {}

  ngOnInit() {
    this.machine.interpretMachine(
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
    this.usernameInteractions();
    this.passwordInteractions();
    this.isUsernameUniqueInteractions();
    this.submitInteractions();
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  onSubmit(event: MouseEvent) {
    event.preventDefault();
    this.machine.send({ type: 'SUBMIT' });
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

  private usernameInteractions() {
    fromEvent<any>(this.usernameField.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.machine.send({
            type: 'USERNAME_EDITING',
          }),
        ),
        debounceTime(500),
        tap(event => {
          this.machine.send({
            type: 'SET_USERNAME',
            payload: { username: event.target.value },
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});
  }

  private passwordInteractions() {
    fromEvent<any>(this.passwordField.nativeElement, 'input')
      .pipe(
        tap(() =>
          this.machine.send({
            type: 'PASSWORD_EDITING',
          }),
        ),
        debounceTime(500),
        tap(event => {
          this.machine.send({
            type: 'SET_PASSWORD',
            payload: { password: event.target.value },
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});
  }
  private isUsernameUniqueInteractions() {
    this.machine.state
      .pipe(
        switchMap(state =>
          !state.matches('username.uniquePending')
            ? NEVER
            : this.usernameService
                .isUsernameUnique(state.context.username)
                .pipe(
                  map(isUnique => {
                    if (isUnique) {
                      this.machine.send({
                        type: 'UNIQUE_SUCCESS',
                      });
                    } else {
                      this.machine.send({
                        type: 'UNIQUE_FAILURE',
                      });
                    }
                    return state;
                  }),
                  catchError(_ => {
                    this.machine.send({
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

  private submitInteractions() {
    this.machine.state
      .pipe(
        filter(state => state.matches('submit.enabled')),
        tap(() => this.machine.send({ type: 'SUBMIT_PENDING' })),
        exhaustMap(state =>
          this.usernameService.create(state.context).pipe(
            tap(() => this.machine.send({ type: 'SUBMIT_SUCCESS' })),
            catchError(_ => {
              this.machine.send({
                type: 'SUBMIT_FAILURE',
              });
              return of(state);
            }),
          ),
        ),
        takeUntil(this.destroy),
      )
      .subscribe(_ => {});
  }
}
