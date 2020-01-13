export class LongPress2 extends Event {
  constructor(name) {
    super("long-press-2" + name, {bubbles: true, composed: true});
  }
}

export class LongPress2Controller /*extends CascadeEvent*/ {

  constructor() {
    this.state = [];
    this.observedTriggers = ["mousedown"];
    this.observedPrevented = [];
    this.timer = 0;
  }

  getObservedNames(){
    return this.observedTriggers.concat(this.observedPrevented);
  }

  mousedownTrigger(event) {
    if (event.buttons !== 1)               //not a left button press
      return;
    this.timer = setTimeout(function () {
      // window.grabEvents(["mousemove", "mouseup"], undefined, this);      //todo here i should call grab...
      event.target.dispatchEvent(new LongPress2("-activated"));
    }, 500);
    this.observedTriggers = ["long-press-2-activated"];
    this.observedPrevented = ["mousedown", "mouseup"];
  }

  longPressActivatedTrigger(event) {
    this.observedTriggers = ["mouseup"];
    this.observedPrevented = ["mousedown"];
  }

  mouseupTrigger(event) {
    event.preventDefault();
    this.observedTriggers = ["mousedown"];
    this.observedPrevented = [];
    queueTaskInEventLoop(function(){
      event.target.dispatchEvent(new LongPress2(""));
    });
  }

  triggerEvent(event) {
    if (event.type === "mousedown")
      return this.mousedownTrigger(event);
    if (event.type === "long-press-2-activated")
      return this.longPressActivatedTrigger(event);
    if (event.type === "mouseup")
      return this.mouseupTrigger(event);
    throw new Error("omg");
  }

  /**
   * The cancelCascade callback is a method that should reset an EventCascade function.
   * In principle, the cancelCascade is called when another EventCascade function takes
   * control of an EventCascade that this EventCascade function has either started listening
   * to, or would be listening to.
   *
   * In practice, cancelCascade(event) is triggered in 3 situations:
   * 1. when an observedPrevented event occurs.
   * 2. when another EventCascade calls preventDefault() on an observedTriggerEvent.
   * 3. when another EventCascade grabs an an observedPrevented event OR observedTriggerEvent.
   *
   * @param eventOrEventType either the event itself, in case of 1 or 2, or just a string with the eventType in case of 3.
   */
  cancelCascade(eventOrEventType) {
    clearTimeout(this.timer);
    this.state = [];
    this.observedTriggers = ["mousedown"];
    this.observedPrevented = [];
  }

  matches(event, el) {
    return el.hasAttribute && el.hasAttribute("long-press-2");
  }
}
