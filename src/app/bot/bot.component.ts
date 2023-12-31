import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
import * as _ from 'lodash';

enum BotCssClasses {
  BOT_ELEMENT = '--bot-element',
  DISABLE_CLICK = '--bot-not-clickable',
  HOVERED = '--bot-hovered',
  HIGHLIGHT = '--bot-highlight',
  SUGGESTED = '--bot-suggested',
  SELECTED = '--bot-selected',
  ACTION_TARGET = '--bot-target',
  LOOP_ACTION_TARGET = '--bot-loop-target',
}

type BotTask = {
  action: 'click' | 'input';
  targetElements: Element[];
  actionText?: string;
};

@Component({
  selector: 'app-bot',
  templateUrl: './bot.component.html',
  styleUrls: ['./bot.component.css'],
})
export class BotComponent {
  @HostListener('click', ['$event'])
  clickInside(event: any) {
    //don't bubble click to outside
    event.stopPropagation();
  }

  @HostListener('document:mousemove', ['$event'])
  mouseMove(event: any) {
    if (this.step != 1 && this.step != 3) return;

    const element: Element = document.elementFromPoint(
      event.clientX,
      event.clientY
    )!;
    const isChildOfBotModal = !element || this.eRef.nativeElement.contains(element);

    if (isChildOfBotModal) {
      this.hoveredElement = null;
      return;
    }

    this.hoveredElement = element;
    this.pointerCapturePosition = element.getBoundingClientRect();
  }

  @HostListener('document:mousedown')
  mouseDown() {
    if (this.isRunningBot) return;
    this.pointerCaptureRef.nativeElement.style.pointerEvents = 'all';
  }

  @HostListener('document:mouseup')
  mouseUp() {
    if (this.isRunningBot) return;
    this.pointerCaptureRef.nativeElement.style.pointerEvents = 'none';
  }  
  
  @ViewChild('pointerCaptureElement') pointerCaptureRef: ElementRef;
  pointerCapturePosition: DOMRect | null;
  step: number = 1;
  
  hoveredElement: Element | null;
  selectedElements: Element[] = [];
  suggestedElements: Element[] = [];
  targetElement: Element | null;
  loopTargetElements: Element[] = [];
  selectedAction: 'click' | 'input';
  actionText: string = ''; //for input action

  isRunningBot: boolean = false;
  botTasks: BotTask[] = [];

  constructor(private eRef: ElementRef) {}

  findElementSuggestions(elements: Element[]) {
    this.clearSuggestedElements();

    if (elements[0].parentNode == null) {
      return [];
    }

    const elTags: any[] = [];
    const elParents: any[] = [];

    elements.forEach((el) => {
      elParents.push(el.parentNode);
      elTags.push(el.tagName);
    });

    const hasSameTag: boolean = this.areAllArrayItemsEqual(elTags);
    const hasSameParent: boolean = this.areAllArrayItemsEqual(elParents);

    if (!hasSameTag || !hasSameParent) return [];

    const suggestions = Array.from(
      elements[0].parentNode.querySelectorAll(elTags[0])
    ).filter((el) => !elements.includes(el));

    return suggestions;
  }

  findSimilarChildElement(
    element: Element,
    childElement: Element
  ): Element | null | undefined {
    const childElementClasses = childElement.className.split(' ');
    const scoreSheet: any = {};
    const sameTagElements = Array.from(
      element.querySelectorAll(childElement.tagName)
    );
    sameTagElements.forEach((sameTagElement, index) => {
      let score = 0;

      //how many similar classes does element have
      const sameClassesArray = _.intersection(
        sameTagElement.className.split(' '),
        childElementClasses
      );
      score += sameClassesArray.length * 7;

      if (sameTagElement.textContent == childElement.textContent) {
        score += 10;
      }

      if (sameTagElement.parentElement?.tagName == childElement.parentElement?.tagName) {
        score += 5;
      }

      scoreSheet[index] = score;
    });

    let maxScore = 0;
    let mostSimilarChildElement;

    Object.keys(scoreSheet).forEach((key) => {
      if (scoreSheet[key] > maxScore) {
        maxScore = scoreSheet[key];
        mostSimilarChildElement = sameTagElements[parseInt(key)];
      }
    });

    /* lower for less strict element similarity
    higher for more strict similiarty */
    const minSimilarityScore = 7;
    return maxScore > minSimilarityScore ? mostSimilarChildElement : null;
  }

  runBot() {
    this.isRunningBot = true;

    this.botTasks.forEach((task) => this.executeTask(task));

    this.botTasks = [];
    this.clearSelectedElements();
    this.step = 1;
    this.isRunningBot = false;
  }

  executeTask(task: BotTask) {
    task.targetElements.forEach((taskElement) => {
      if (task.action == 'click') {
        (taskElement as HTMLElement).click();
      } else {
        (taskElement as HTMLInputElement).value = task.actionText || '';
        //allow application to respond to input
        taskElement.dispatchEvent(new Event('input'));
      }
    });
  }

  clearSelectedElements() {
    this.removeClassesFromElements(this.selectedElements, Object.values(BotCssClasses));
    this.selectedElements = [];
  }

  clearSuggestedElements() {
    this.removeClassesFromElements(this.suggestedElements, Object.values(BotCssClasses));
    this.suggestedElements = [];
  }

  nextStep() {
    this.step++;
  }

  selectElement(element: Element) {
    if (this.isRootElement(element)) {
      return;
    }

    this.addClassesToElements(element, [
      BotCssClasses.SELECTED,
      BotCssClasses.DISABLE_CLICK,
    ]);
    this.selectedElements.push(element);

    if (this.selectedElements.length >= 2) {
      this.suggestedElements = this.findElementSuggestions(
        this.selectedElements
      );
      this.suggestedElements.map((suggestedElement) => {
        this.addClassesToElements(suggestedElement, [
          BotCssClasses.SUGGESTED,
          BotCssClasses.DISABLE_CLICK,
        ]);
      });
    }
  }

  isRootElement(element: Element) {
    const isRootElement = element == document.documentElement;
    const isBodyElement = element == document.body;
    const isAppElement = element == document.querySelector('#app');
    return isBodyElement || isRootElement || isAppElement;
  }

  selectAction(action: 'click' | 'input') {
    this.selectedAction = action;
    this.addClassesToElements(this.selectedElements, [BotCssClasses.HIGHLIGHT]);
    this.removeClassesFromElements(this.selectedElements, [BotCssClasses.DISABLE_CLICK]);
  }

  selectTargetElement(element: Element) {
    //only allow child elements
    if (this.selectedElements.includes(element)) {
      alert('Target element has to be a child of list element');
      return;
    }

    this.clearTargetElement();
    this.targetElement = element;
    this.addClassesToElements(element, [
      BotCssClasses.ACTION_TARGET,
      BotCssClasses.DISABLE_CLICK,
    ]);

    const similarChildElements: Element[] = [];
    this.selectedElements.forEach((selectedElement) => {
      const similarElement = this.findSimilarChildElement(
        selectedElement,
        element
      );

      if (similarElement && element != similarElement)
        similarChildElements.push(similarElement);
    });

    this.clearLoopTargetElements();
    this.selectLoopTargetElements(similarChildElements);
  }

  selectLoopTargetElements(elements: Element[]) {
    elements.forEach((element) =>
      this.addClassesToElements(element, [
        BotCssClasses.LOOP_ACTION_TARGET,
        BotCssClasses.DISABLE_CLICK,
      ])
    );
    this.loopTargetElements = elements;
  }

  saveTask() {
    const task: BotTask = {
      action: this.selectedAction,
      targetElements: [this.targetElement!, ...this.loopTargetElements],
      actionText: this.actionText,
    };
    this.botTasks.push(task);

    this.clearTargetElement();
    this.actionText = '';
    this.clearLoopTargetElements();

    this.step = 2;
  }

  clearTargetElement() {
    if (!this.targetElement) return;

    this.removeClassesFromElements(this.targetElement, [
      BotCssClasses.ACTION_TARGET,
      BotCssClasses.DISABLE_CLICK,
    ]);
    this.targetElement = null;
  }

  clearLoopTargetElements() {
    this.removeClassesFromElements(this.loopTargetElements, [
      BotCssClasses.LOOP_ACTION_TARGET,
      BotCssClasses.DISABLE_CLICK,
    ]);
    this.loopTargetElements = [];
  }

  onPointerMouseUp() {
    if (!this.hoveredElement) return;
    if (this.step == 1) this.selectElement(this.hoveredElement);
    else if (this.step == 3) {
      this.selectTargetElement(this.hoveredElement);
    }
  }

  addClassesToElements(elements: Element | Element[], cssClasses: string[]) {
    const array = Array.isArray(elements) ? elements : [elements];    
    array.forEach(element => {
      cssClasses.forEach((cssClass) => element.classList.add(cssClass))
    });
  }

  removeClassesFromElements(elements: Element | Element[], cssClasses: string[]) {
    const array = Array.isArray(elements) ? elements : [elements];
    array.forEach((element) => {
      cssClasses.forEach((cssClass) => element.classList.remove(cssClass));
    });
  }

  moveSuggestionsToSelection() {
    this.selectedElements = [
      ...this.selectedElements,
      ...this.suggestedElements,
    ];
    this.suggestedElements = [];
  }

  areAllArrayItemsEqual(arr: any[]): boolean {
    return arr.every((val) => val === arr[0]);
  }

  get totalElements() {
    return this.selectedElements.length + this.suggestedElements.length;
  }
}
