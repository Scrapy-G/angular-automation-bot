import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BotComponent } from './bot.component';
import { NoBubbleClickDirective } from './no-bubble-click.directive';



@NgModule({
  declarations: [
    BotComponent,
    NoBubbleClickDirective
  ],
  imports: [
    CommonModule
  ]
})
export class BotModule { }
