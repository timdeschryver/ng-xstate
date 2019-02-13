import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay, map, tap, take } from 'rxjs/operators';

@Injectable()
export class UsernameService {
  private usernames = ['foo', 'bar', 'baz'];

  isUsernameUnique(username: string) {
    return of(this.usernames).pipe(
      take(1),
      tap(() => console.log(`Making call for '${username}' ...`)),
      delay(2_000),
      map(usernames => usernames.includes(username)),
    );
  }

  create({ username, password }: { username: string; password: string }) {
    return of(true).pipe(
      take(1),
      tap(() => console.log(`Creating user for '${username}' ...`)),
      delay(2_000),
    );
  }
}
