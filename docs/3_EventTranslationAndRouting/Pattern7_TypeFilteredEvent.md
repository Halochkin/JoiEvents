# Pattern: TypeFilteredEvent

The TypeFilteredEvent very much resemble the AttributeFilteredEvent. As with the AttributeFilteredEvent,
the TypeFilteredEvent will filter the target chain of the triggering event to potentially find a 
suitable target for its new composed event. The method thus looks like this:

```javascript
function filterOnType(e, typeName) {
  for (var el = e.target; el; el = el.parentNode) {
    if (el.nodeName === typeName)
      return el;
  }
}                            
```

## Example: `link-click` with TypeFilter

Custom, composed TypeFilteredEvent is extremely useful for link clicks.
When the user clicks on an element within a page and that element is a child of a `<a href>`,
that click will trigger the browser to navigate. However, if the clicked element is not a
child of a link, then the event will not trigger a link click.
To have a custom event that always trigger if the user clicks on a link thus gives us a simple,
efficient way to intercept all link clicks. Below is a naive implementation of such a 
custom, TypeFiltered PriorEvent `link-click`:

<pretty-printer href="./demo/link-click-TypeFiltered.js"></pretty-printer>

## Demo: `link-click` with TypeFilter

In the demo below we use `link-click` to control navigation. 
It is in a sense a micro, binary router, 
a router that blocks or let pass different navigation events.

<code-demo src="./demo/link-click-TypeFiltered.html"></code-demo>

## References

 * 
                                                                            