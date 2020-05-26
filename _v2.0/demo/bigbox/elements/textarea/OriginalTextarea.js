import {SlottablesEventMixin} from "../../../../src/joi2.js";
import {} from "../TextCaret/TextCaret.js";

class OriginalTextarea extends SlottablesEventMixin(HTMLElement) {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `<style>
  :host(:focus-within) div {
    outline: 1px orangered ridge;
  }
  :host {
    cursor: text;
  }
  span{
    white-space: pre;
  }
</style><div><span> </span><text-caret></text-caret><span> </span></div>`;
    this._container = this.shadowRoot.children[1];
    this._pre = this._container.children[0].childNodes[0];
    this._caret = this._container.children[1];
    this._post = this._container.children[2].childNodes[0];
    this._pre.data = "";
    this._post.data = "";

    //listen only for the composing-completed beforeinput events.
    this._caret.addEventListener("beforeinput", e => !e.isComposing && e.setDefault(this._onBeforeinput.bind(this)));
    this.shadowRoot.addEventListener("keydown", this._onKeydown.bind(this));
    //internal event controller that bounces the focus event DOWN!! Todo think about this concept of bouncing events down...
    this.addEventListener("mousedown", e => this._caret !== this.shadowRoot.activeElement && toggleTick(this.focus.bind(this)));
    //todo do we need this one too?
    // this.addEventListener("touchstart", e => this._caret !== this.shadowRoot.activeElement && toggleTick(this.focus.bind(this)));

    this.addEventListener("slottables-changed", this._slottablesChanged.bind(this));
  }

  static get observedAttributes() {
    return ["col", "rows"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "col") {
      this._container.style.height = newValue + "em";
    } else if (name === "rows") {
      this._container.style.width = newValue + "em";
    }
  }

  get form() {
    let parent = this.parentNode;
    while (!(parent instanceof HTMLFormElement))
      parent = parent.parentNode;
    return parent;
  }

  get value() {
    return this._pre.data + this._caret.innerText + this._post.data;
  }

  set value(ignore) { //todo do we need this one
  }

  //todo check and override the innerText functions
  get innerText() {
    return this.value;
  }

  set innerText(textValue) {
    //todo convert the text to pure text
    this._pre.data = textValue;
    this._caret.innerText = "";
    this._post.data = "";
  }

  //simplified, assumes only a single text childNode
  _slottablesChanged() {
    this._pre.data = this.childNodes[0].data;
    this._caret.innerText = "";
    this._post.data = "";
  }

  focus() {
    this._caret.focus();
  }

  _onBeforeinput(e) {
    if (e.inputType === "insertParagraph")
      this._pre.data += "\n";
    else if (e.inputType === "deleteContentBackward" && this._caret.innerText !== "")
      this._caret.innerText = "";
    else if (e.inputType === "deleteContentBackward" && this._caret.innerText === "" && this._pre.data.length > 0)
      this._pre.data = this._pre.data.slice(0, -1);
    else if (e.inputType === "insertText")
      this._pre.data += e.data;
    console.log(e.inputType)
    const inputEvent = new InputEvent("input", e);       //todo this is composed, but should be non-composed
    this.dispatchEvent(inputEvent);
  }

  _onKeydown(e) {
    if (e.code === "ArrowRight" && this._post.data.length > 0)
      return e.setDefault(this._moveRight.bind(this, e.ctrlKey));
    if (e.code === "ArrowLeft" && this._pre.data.length > 0)
      return e.setDefault(this._moveLeft.bind(this, e.ctrlKey));
    if (e.code === "Home")
      return e.setDefault(this._moveHome.bind(this, e.ctrlKey));
    if (e.code === "End")
      return e.setDefault(this._moveEnd.bind(this, e.ctrlKey));
  }

  _onMousedown(e) {
    //todo should this be a default action? I can't block the native defaultAction of the native focusController..
    //todo no, this shouldn't be a default action, it should be a focus event controller.. But how to implement this?
    //there is no focus() callback? can we override focus()? will that be triggered by the native requestFocus()?
    e.setDefault(e => this.focus());
  }

  _moveRight(ctrl) {
    //todo implement ctrl
    const one = this._post.data[0];
    this._post.data = this._post.data.slice(1);
    this._pre.data += one;
  }

  _moveLeft(ctrl) {
    //todo implement ctrl
    const one = this._pre.data[this._pre.data.length - 1];
    this._pre.data = this._pre.data.slice(0, this._pre.data.length - 1);
    this._post.data = one + this._post.data;
  }

  _moveHome(ctrl) {
    //todo, not implemented home key that goes to next end of line
    this._post.data = this._pre.data + this._post.data;
    this._pre.data = "";
  }

  _moveEnd(ctrl) {
    //todo, not implemented home key that goes to next end of line
    this._pre.data += this._post.data;
    this._post.data = "";
  }
}

customElements.define("original-textarea", OriginalTextarea);