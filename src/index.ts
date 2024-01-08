import { type SwaggerUIPlugin } from "swagger-ui"
import { fromJS } from "immutable"
import type * as Immutable from "immutable"

// biome-ignore lint/suspicious/noExplicitAny: Swagger UI is not well typed.
export type SwaggerUiSystem = any;
// biome-ignore lint/suspicious/noExplicitAny: Swagger UI is not well typed.
export type SwaggerUiSpecParameters = Record<string, any>;

export interface ApiInput {
  parameters?: SwaggerUiSpecParameters;
  bodyValue?: string;
  requestContentType?: string;
  responseContentType?: string;
}

export type ApiInputs = Record<string, Record<string, ApiInput>>

interface SpecMeta {
  parameters?: SwaggerUiSpecParameters;
}

interface Oas3RequestData {
  bodyValue?: string;
  requestContentType?: string;
  responseContentType?: string;
}

interface SwaggerUiStateJs {
  spec?: {
    meta?: {
      paths: Record<string, Record<string, SpecMeta>>;
    };
  };
  oas3?: {
    requestData?: Record<string, Record<string, Oas3RequestData>>;
  };
}

// biome-ignore lint/suspicious/noExplicitAny: Swagger UI is not well typed.
type SwaggerUiState = Immutable.Map<string, any>;

// biome-ignore lint/suspicious/noExplicitAny: Swagger UI is not well typed.
type SwaggerUiActionPayload = any;

type SwaggerUiAction = {
  type: string;
  payload?: SwaggerUiActionPayload;
};

const inputsOfStateJs = (stateJs: SwaggerUiStateJs) => {
  const specMetaPaths = stateJs?.spec?.meta?.paths ?? {};
  const oas3RequestData = stateJs?.oas3?.requestData ?? {};
  const inputs: ApiInputs = {}
  for (const [path, methods] of Object.entries(specMetaPaths)) {
    if (!inputs[path]) {
      inputs[path] = {};
    }
    for (const [method, meta] of Object.entries(methods)) {
      if (!meta?.parameters) {
        continue;
      }
      if (!inputs[path][method]) {
        inputs[path][method] = {};
      }
      inputs[path][method].parameters = meta?.parameters;
    }
  }
  for (const [path, methods] of Object.entries(oas3RequestData)) {
    if (!inputs[path]) {
      inputs[path] = {};
    }
    for (const [method, meta] of Object.entries(methods)) {
      if (!(meta?.bodyValue || meta?.requestContentType || meta?.responseContentType)) {
        continue;
      }
      if (!inputs[path][method]) {
        inputs[path][method] = {};
      }
      if (meta?.bodyValue) {
        inputs[path][method].bodyValue = meta?.bodyValue;
      }
      if (meta?.requestContentType) {
        inputs[path][method].requestContentType = meta?.requestContentType;
      }
      if (meta?.responseContentType) {
        inputs[path][method].responseContentType = meta?.responseContentType;
      }
    }
  }
  return inputs;
}

export interface SpicyInputActions {
  setParameters: (path: string, method: string, value: SwaggerUiSpecParameters) => void;
  setRequestBodyValue: (path: string, method: string, value: string) => void;
  setRequestContentType: (path: string, method: string, value: string) => void;
  setResponseContentType: (path: string, method: string, value: string) => void;
}

export const actions: (system: SwaggerUiSystem) => SpicyInputActions = (system: SwaggerUiSystem) => {
  return {
    setParameters(path: string, method: string, value: SwaggerUiSpecParameters) {
      system.getSystem().spicyInputActions.setParameters(path, method, value);
    },
    setRequestBodyValue(path: string, method: string, value: string) {
      system.getSystem().spicyInputActions.setRequestBodyValue(path, method, value);
    },
    setRequestContentType(path: string, method: string, value: string) {
      system.getSystem().spicyInputActions.setRequestContentType(path, method, value);
    },
    setResponseContentType(path: string, method: string, value: string) {
      system.getSystem().spicyInputActions.setResponseContentType(path, method, value);
    },
  }
}

export interface SpicyInputSelectors {
  inputs: () => ApiInputs;
}

export const selectors: (system: SwaggerUiSystem) => SpicyInputSelectors = (system: SwaggerUiSystem) => {
  return {
    inputs: () => system.getSystem().spicyInputSelectors.inputs(),
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Immutable is not well typed.
export type InputsToImport = ApiInputs | Immutable.Map<string, Immutable.Map<string, Immutable.Map<keyof ApiInput, any>>>;

export interface SpicyInputFn {
  subscribe: (callback: () => void) => () => void;
  importInputs: (inputs: InputsToImport | undefined | null) => void;
}

export const fn: (system: SwaggerUiSystem) => SpicyInputFn = (system: SwaggerUiSystem) => {
  return {
    subscribe(callback: () => void) {
      return system.getSystem().fn.spicyInput.subscribe(callback);
    },
    importInputs(inputs: InputsToImport | undefined | null) {
      system.getSystem().fn.spicyInput.importInputs(inputs);
    },
  }
}

export interface SpicyInputOptions {
  persistUserInputs?: boolean;
}

export const getPlugin: (options?: SpicyInputOptions) => SwaggerUIPlugin = (options?: SpicyInputOptions) => (system: SwaggerUiSystem) => {
  const persistUserInputs = options?.persistUserInputs ?? true;

  // It is not certain whether this function is called multiple times, so it is made to be subscribed only once.
  if (!system.getSystem().spicyInput) {
    // Update inputs when state is changed.
    system.getStore().subscribe(() => {
      const inputs = inputsOfStateJs(system.getState().toJS());
      const prevInputs = system.getSystem().spicyInputPrivateSelectors.inputs();
      if (fromJS(inputs).equals(fromJS(prevInputs))) {
        return;
      }
      system.getSystem().spicyInputPrivateActions.setInputs(inputs);
      const subscriptions = system.getSystem().spicyInputPrivateSelectors.subscriptions() as (() => void)[];
      for (const subscription of subscriptions) {
        subscription();
      }
    })
  }

  const afterLoad = !persistUserInputs ? undefined : (system: SwaggerUiSystem) => {
    const key = getLocalStorageKey("inputs");
    const inputs = (() => {
      try {
        const json = localStorage.getItem(key);
        if (!json) {
          return;
        }
        return JSON.parse(json);
      } catch (e) {
        return;
      }
    })()

    const unsubscribe = system.fn.spicyInput.subscribe(() => {
      if (system.getState().getIn(["spec", "json"])) {
        system.fn.spicyInput.importInputs(inputs)
        unsubscribe();
      }
    })

    system.fn.spicyInput.subscribe(() => {
      const inputs = system.spicyInputPrivateSelectors.inputs()

      localStorage.setItem(key, JSON.stringify(inputs));
    });
  };
  return {
    afterLoad,
    statePlugins: {
      spicyInput: {
        actions: {
          setParameters(path: string, method: string, value: SwaggerUiSpecParameters) {
            system.getSystem().getStore().dispatch({
              type: "spec_update_operation_meta_value",
              payload: { path: [path, method], value, key: "parameters" }
            })
            return {
              type: "SPICY_INPUT_SET_PARAMETERS",
            };
          },
          setRequestBodyValue(path: string, method: string, value: string) {
            system.oas3Actions.setRequestBodyValue({ value, pathMethod: [path, method] })
            return {
              type: "SPICY_INPUT_SET_REQUEST_BODY_VALUE",
            };
          },
          setRequestContentType(path: string, method: string, value: string) {
            system.oas3Actions.setRequestContentType({ value, pathMethod: [path, method] })
            return {
              type: "SPICY_INPUT_SET_REQUEST_CONTENT_TYPE",
            };
          },
          setResponseContentType(path: string, method: string, value: string) {
            system.oas3Actions.setResponseContentType({ value, path, method })
            return {
              type: "SPICY_INPUT_SET_RESPONSE_CONTENT_TYPE",
            };
          },
        },
        selectors: {
          inputs: (_state: SwaggerUiStateJs) => system.getSystem().spicyInputPrivateSelectors.inputs(),
        },
      },
      spicyInputPrivate: {
        actions: {
          setInputs: (inputs: ApiInputs) => {
            return {
              type: "SPICY_INPUT_PRIVATE_SET_INPUTS",
              payload: inputs,
            };
          },
          addSubscription: (callback: () => void) => {
            return {
              type: "SPICY_INPUT_PRIVATE_ADD_SUBSCRIPTION",
              payload: callback,
            };
          },
          removeSubscription: (callback: () => void) => {
            return {
              type: "SPICY_INPUT_PRIVATE_REMOVE_SUBSCRIPTION",
              payload: callback,
            };
          }
        },
        reducers: {
          SPICY_INPUT_PRIVATE_SET_INPUTS: (
            state: SwaggerUiState,
            action: SwaggerUiAction,
          ) => {
            return state.set("inputs", action.payload);
          },
          SPICY_INPUT_PRIVATE_ADD_SUBSCRIPTION: (
            state: SwaggerUiState,
            action: SwaggerUiAction,
          ) => {
            const subscriptions = state.get("subscriptions") ?? [];
            if (subscriptions.includes(action.payload)) {
              return state;
            }
            return state.set("subscriptions", [...(state.get("subscriptions") ?? []), action.payload])
          },
          SPICY_INPUT_PRIVATE_REMOVE_SUBSCRIPTION: (
            state: SwaggerUiState,
            action: SwaggerUiAction,
          ) => {
            return state.set("subscriptions", ((state.get("subscriptions") ?? []) as (() => void)[]).filter((item) => item !== action.payload))
          },
        },
        selectors: {
          inputs: (state: SwaggerUiState) => state.get("inputs"),
          subscriptions: (state: SwaggerUiState) => state.get("subscriptions") ?? [],
        },
      },
    },
    fn: {
      spicyInput: {
        subscribe: (callback: () => void) => {
          system.getSystem().spicyInputPrivateActions.addSubscription(callback);
          const unsubscribe = () => {
            system.getSystem().spicyInputPrivateActions.removeSubscription(callback);
          }
          return unsubscribe;
        },
        importInputs: (inputs: InputsToImport) => {
          if (!inputs) {
            return;
          }
          for (const [path, methodValues] of Object.entries(fromJS(inputs).toJS() as ApiInputs)) {
            for (const [method, { parameters, bodyValue, requestContentType, responseContentType }] of Object.entries(methodValues)) {
              if (parameters) {
                system.getSystem().spicyInputActions.setParameters(path, method, parameters);
              }
              if (bodyValue) {
                system.getSystem().spicyInputActions.setRequestBodyValue(path, method, bodyValue);
              }
              if (requestContentType) {
                system.getSystem().spicyInputActions.setRequestContentType(path, method, requestContentType);
              }
              if (responseContentType) {
                system.getSystem().spicyInputActions.setResponseContentType(path, method, responseContentType);
              }
            }
          };
        }
      },
    },
  }
}

const getLocalStorageKey = (key: string) => {
  return `spicy-input/${key}`;
};
