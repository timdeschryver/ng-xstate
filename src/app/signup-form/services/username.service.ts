import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

@Injectable()
export class UsernameService {
  private usernames = ['foo', 'bar', 'baz'];

  isUsernameUnique(username: string) {
    return of(this.usernames).pipe(
      tap(() => console.log(`Making call for '${username}' ...`)),
      delay(2_000),
      map(usernames => usernames.includes(username)),
    );
  }
}
