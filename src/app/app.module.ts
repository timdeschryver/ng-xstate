import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SignUpComponent } from './signup-form/signup-form.component';
import { InviteeComponent } from './party-planner/invitee.component';

@NgModule({
  declarations: [AppComponent, SignUpComponent, InviteeComponent],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
