# Discussion: Different MacroTaskQueues

How many MacroTaskQueues are there? And how does the browser prioritize them? Simple questions that doesn't have a simple answer.

First, the macrotask queues is an area where the browsers differ. Firefox and Chrome and Safari all have essentially different macrotask queues. The different browsers also place different native tasks (events) in different macrotask queues. And the browsers give different priorities to their different macrotask queues. Hurray!

Second, because the browsers implement the macrotask queues differently, there is no specification for the macrotask queues. There is no place where you can read a) how the macrotask queues should behave and b) how the macrotask queues do behave in different browsers. Short of analyzing the source code of the browsers themselves, the browsers event loop is essentially a black box. Hurray hurray!

So, when we need to queue tasks in the event loop, we need to investigate and analyze how the tasks are queued in different browsers, in different situations. The manageable way to do so, is to run a small set of experiments against a small selection of relevant browsers to see how they behave. 

## Experiment 1: `setZeroTimeout` vs. `setToggleTick` vs. `setTimeout`

```javascript
function toggleTick(cb) {
  const details = document.createElement("details");
  details.style.display = "none";
  details.ontoggle = function () {
    details.remove();
    cb();
  };
  document.body.appendChild(details);
  details.open = true;
}

var idOrigin = {};
var idCb = {};

function setZeroTimeout(task) {
  const mid = "pm." + Math.random();    // IE 10 does not support location.origin
  const origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '');
  idOrigin[mid] = origin;       //todo do I need origin??
  idCb[mid] = task;
  window.postMessage(mid, origin);
  return mid;
}

function onMessage(evt) {
  if (evt.source !== window)
    return;
  const mid = evt.data;
  if (!idOrigin[mid])
    return;
  evt.stopImmediatePropagation();
  const cb = idCb[mid];
  delete idOrigin[mid];
  delete idCb[mid];
  cb();
}

window.addEventListener("message", onMessage);

setTimeout(() => console.log("setTimeout0 1"));
toggleTick(() => console.log("toggleTickTrick 1"));
setZeroTimeout(() => console.log("setZeroTimeout 1"));
setTimeout(() => console.log("setTimeout0 2"));
toggleTick(() => console.log("toggleTickTrick 2"));
setZeroTimeout(() => console.log("setZeroTimeout 2"));
```

## Results: Chrome 79 and Firefox 71

```
 toggleTickTrick 1
 setZeroTimeout 1
 toggleTickTrick 2
 setZeroTimeout 2
 setTimeout0 1
 setTimeout0 2
```

Chrome and Firefox adds the `message` and `toggle` event in the same macrotask queue, or at least two macrotask queues that have the same priority. But, the setTimoeAll browsers puts the timeouts last.  

## Results: Safari IOS 13.3

```
 toggleTickTrick 1
 toggleTickTrick 2
 setZeroTimeout 1
 setZeroTimeout 2
 setTimeout0 1
 setTimeout0 2
```

Safari behaves differently. While Chrome and Firefox consistently puts setTimeout tasks last, Safari can on some occasions run setTimeout tasks first. However, the most consistent behavior in the Safari event loop seems to be that the toggle events are processed before the setZeroTimeout events that in turn come before setTimeout.

## Conclusion

All three browsers use a separate macrotask queue for `setTimeout` tasks. This macrotask queue is not processed until all `toggle` and `message` events (tasks) have been dispatched (processed).

In Chrome and Firefox, there is no difference in priority between `toggle` and `message` events. They appear to be added to the same macrotask queue and between themselves processed FIFO.
  
However, in Safari, `message` events appear not to be queued in the same macrotask queue. Safari operates with a different macrotask queue for `messages`, and Safari gives this macrotask queue a lower priority than `toggle` (an most likely other DOM events).

So, while `setZeroTimeout` would be the most practical and efficient pattern in Chrome and Firefox in isolation, it appears as though the ToggleTickTrick is the best pattern when the solution aims to be consistent with Safari.

Safari appears to take more contextual factors into account when deciding event loop priorities than Firefox and Chrome, thus becoming more inconsistent. But, if you for example need to add two tasks to the event loop that both should be completed in the given order, then you are likely best served using ToggleTickTrick.     

## References

  * dunno