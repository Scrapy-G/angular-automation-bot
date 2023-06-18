import { Component, HostListener, ElementRef } from '@angular/core';
import * as _ from 'lodash';

@Component({
  selector: 'app-bot',
  templateUrl: './bot.component.html',
  styleUrls: ['./bot.component.css'],
})
export class BotComponent {
  @HostListener('click', ['$event'])
  clickinside(event: any) {
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (this.isRunningBot) return;

    // click is outside bot modal
    if (!this.eRef.nativeElement.contains(event.target)) {
      event.stopPropagation();
      if (this.step == 3)
        this.selectActionTargetEl(event);
      else
        this.selectElement(event.target);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  hover(e: any) {
    //highlight hovered els
    if (this.step != 1) return;

    const el: Element = document.elementFromPoint(e.clientX, e.clientY)!;

    if (!el || this.eRef.nativeElement.contains(el)) return;

    if (this.hoveredEl) {
      this.hoveredEl.classList.remove('bot-el-hover');
    }
    this.hoveredEl = el;
    el.classList.add('bot-el-hover');
  }

  step: number = 1;

  hoveredEl: Element;
  selectedEls: Element[] = [];
  suggestedEls: Element[] = [];

  isRunningBot: boolean = false;
  botAction: {
    type: 'click' | 'input';
    targetSelector: string;
    targetEl: Element | null;
    content: string;
  } = {
    type: 'click',
    targetSelector: '',
    targetEl: null,
    content: '',
  };

  constructor(private eRef: ElementRef) {}

  findSuggestions(els: Element[]) {
    if (els[0].parentNode == null) {
      return [];
    }

    const elTags: any[] = [];
    const elParents: any[] = [];

    els.forEach((el) => {
      elParents.push(el.parentNode);
      elTags.push(el.tagName);
    });

    const hasSameTag: boolean = this.allEqual(elTags);
    const hasSameParent: boolean = this.allEqual(elParents);

    if (!hasSameTag || !hasSameParent) return [];

    const suggestions = Array.from(
      els[0].parentNode.querySelectorAll(elTags[0])
    ).filter((el) => !els.includes(el));

    return suggestions;
  }

  executeActions() {
    // console.log('actions', this.botAction);
    // console.log('selection', this.selectedEls);
    this.isRunningBot = true;

    this.selectedEls.forEach((el) => {
      const targetEl = el.querySelector(this.botAction.targetSelector);
      if (!targetEl) return;

      if (this.botAction.type == 'click') {
        (targetEl as HTMLElement).click();
      } else {
        (targetEl as HTMLInputElement).value = this.botAction.content;
        targetEl.dispatchEvent(new Event('input'));
      }
    });

    this.isRunningBot = false;
    this.resetSteps();
  }

  clearSelectedElements() {
    //remove all added element styles
    this.removeClassFromSelectedEls('bot-el');
    this.removeClassFromSelectedEls('bot-highlight');
    this.removeClassFromSelectedEls('bot-no-overlay');
    this.selectedEls = [];
    this.suggestedEls = [];
  }

  resetSteps() {    
    this.botAction.targetEl?.classList.remove('bot-el-action-target');
    this.step = 1;
    this.clearSelectedElements();
  }

  nextStep() {
    this.step++;
  }

  selectElement(el: Element) {
    el.classList.add('bot-el');
    el.classList.add('bot-el-selected');
    el.classList.add('bot-el-not-clickable');
    this.selectedEls.push(el);
    if (this.selectedEls.length >= 2) {
      this.suggestedEls = this.findSuggestions(this.selectedEls);
      this.suggestedEls.map((el) => {
        el.classList.add('bot-el');
        el.classList.add('bot-el-suggested');
      });
    }
  }

  selectAction(actionType: 'click' | 'input') {
    this.botAction.type = actionType;
    this.addClassToSelectedEls('bot-highlight');
    this.removeClassFromSelectedEls('bot-el-not-clickable');
    this.nextStep();
  }

  selectActionTargetEl(event: any) {
    this.addClassToSelectedEls('bot-no-overlay');
    const el: Element = document.elementFromPoint(
      event.clientX,
      event.clientY
    )!;

    this.botAction.targetEl = el;

    let selector = el.tagName;
    
    if (el.className !== '') {
      const classNames = el.className.split(' ');  
      selector = [selector, ...classNames].join('.')
    }

    this.botAction.targetSelector = selector;
    el.classList.add('bot-el-action-target');
  }

  addClassToSelectedEls(className: string) {
    this.selectedEls.map((el) => el.classList.add(className));
  }

  removeClassFromSelectedEls(className: string) {
    [...this.selectedEls, ...this.suggestedEls]
      .map((el) => el.classList.remove(className));
  }

  moveSuggestionsToSelection() {
    this.selectedEls = [...this.selectedEls, ...this.suggestedEls];
    this.addClassToSelectedEls('bot-el-not-clickable');
    this.suggestedEls = [];
  }

  allEqual(arr: any[]): boolean {
    return arr.every((val) => val === arr[0]);
  }

  get totalElements() {
    return this.selectedEls.length + this.suggestedEls.length;
  }
}
