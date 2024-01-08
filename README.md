## Spicy Input (Swagger UI Plugin)

There is no straightforward method in the standard features of Swagger UI to programmatically manipulate user inputs such as query parameters and request bodies. Spicy-input provides a concise interface for retrieving, setting, and subscribing to these user inputs.

Furthermore, user inputs are completely lost upon reloading Swagger UI. During API development, there is often a desire to reload Swagger UI whenever the API interface is modified, but also a need to remember the inputted content. Spicy-input makes it easy to retain these user inputs.

## Basic Usage

## With npm

```shell
npm i spicy-input
```

Pass this plugin to options.

```js
const spicyInput = require('spicy-input')

SwaggerUI({
  plugins: [
    spicyInput.getPlugin()
  ]
})
```

TypeScript:

```typescript
import * as spicyInput from 'spicy-input';

SwaggerUI({
  plugins: [
    spicyInput.getPlugin()
  ]
})
```

## With UNPKG

```html
<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />

<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script src="https://unpkg.com/spicy-input"></script>

<script>
window.onload = () => {
  SwaggerUIBundle({
    plugins: [
      spicyInput.getPlugin()
    ]
  })
}
</script>
```

## With jsDelivr

```html
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css" />

<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/spicy-input"></script>

<script>
window.onload = () => {
  SwaggerUIBundle({
    plugins: [
      spicyInput.getPlugin()
    ]
  })
}
</script>
```

## Options

You can choose to activate the memory function for user inputs by specifying options. It is enabled by default.

```typescript
import * as spicyInput from 'spicy-input';

SwaggerUI({
  plugins: [
    // Disable the memory of user inputs.
    spicyInput.getPlugin({ persistUserInputs: false })
  ]
})
```

## APIs

You can manipulate user inputs through the system.

```typescript
const system = SwaggerUI({
  plugins: [
    spicyInput.getPlugin()
  ]
})
```

### Get user inputs

You can get all current user inputs.

```typescript
const spicyInputSelectors = spicyInput.selectors(system);
const inputs = spicyInputSelectors.inputs();
console.log(inputs);
```

### Set user inputs

You can set user inputs programatically.

```typescript
const spicyInputActions = spicyInput.actions(system);

// Set parameter
spicyInputActions.setParameters("/cat/{id}", "get", {
  "path.id.hash-1048705885": {
    "value": "xxxxx"
  },
});
// Other functions
spicyInputActions.setRequestBodyValue;
spicyInputActions.setRequestContentType;
spicyInputActions.setResponseContentType;
```

You can infer what specific values to set based on the current input values.

### Subscription

You can subscribe to changes in user inputs.

```typescript
const spicyInputFn = spicyInput.fn(system);
// subscribe
const unsubscribe = spicyInputFn.subscribe(() => {
  const spicyInputSelectors = spicyInput.selectors(system);
  const inputs = spicyInputSelectors.inputs();
  console.log(inputs);
});
// unsubscribe
unsubscribe();
```

### Import

You can import saved user inputs.

```typescript
const spicyInputSelectors = spicyInput.selectors(system);
// Get inputs
const inputs = spicyInputSelectors.inputs();

// ...

const spicyInputFn = spicyInput.fn(system);
// Import inputs
spicyInputFn.importInputs(inputs);
```
