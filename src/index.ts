import { type SwaggerUIPlugin } from "swagger-ui"
import { fromJS, type Map } from "immutable"

export interface ApiInput {
  parameters?: any;
  bodyValue?: string;
  requestContentType?: string;
  responseContentType?: string;
}

export type ApiInputs = Record<string, Record<string, ApiInput>>

const inputsOfState = (state: any) => {
  const stateJs = state.toJS();
  const specMetaPaths: { [key: string]: { [key: string]: any } } = stateJs?.spec?.meta?.paths ?? {};
  const oas3RequestData: { [key: string]: { [key: string]: any } } = stateJs?.oas3?.requestData ?? {};
  const inputs: ApiInputs = {}
  Object.entries(specMetaPaths).forEach(([path, methods]) => {
    if (!inputs[path]) {
      inputs[path] = {};
    }
    Object.entries(methods).forEach(([method, meta]) => {
      if (!meta?.parameters) {
        return;
      }
      if (!inputs[path][method]) {
        inputs[path][method] = {};
      }
      inputs[path][method].parameters = meta?.parameters;
    })
  })
  Object.entries(oas3RequestData).forEach(([path, methods]) => {
    if (!inputs[path]) {
      inputs[path] = {};
    }
    Object.entries(methods).forEach(([method, meta]) => {
      if (!(meta?.bodyValue || meta?.requestContentType || meta?.responseContentType)) {
        return;
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
    })
  })
  return inputs;
}

export interface SpicyInputActions {
  setParameters: (path: string, method: string, value: any) => void;
  setRequestBodyValue: (path: string, method: string, value: string) => void;
  setRequestContentType: (path: string, method: string, value: string) => void;
  setResponseContentType: (path: string, method: string, value: string) => void;
}

export const actions: (system: any) => SpicyInputActions = (system: any) => {
  return {
    setParameters(path: string, method: string, value: any) {
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

export const selectors: (system: any) => SpicyInputSelectors = (system: any) => {
  return {
    inputs: () => system.getSystem().spicyInputSelectors.inputs(),
  }
}

export type InputsToImport = ApiInputs | Map<string, Map<string, Map<keyof ApiInput, any>>>;

export interface SpicyInputFn {
  subscribe: (callback: () => void) => () => void;
  importInputs: (inputs: InputsToImport) => void;
}

export const fn: (system: any) => SpicyInputFn = (system: any) => {
  return {
    subscribe(callback: () => void) {
      return system.getSystem().fn.spicyInput.subscribe(callback);
    },
    importInputs(inputs: InputsToImport) {
      system.getSystem().fn.spicyInput.importInputs(inputs);
    },
  }
}

export interface SpicyInputOptions {
  persistUserInputs?: boolean;
}

export const getPlugin: (options?: SpicyInputOptions) => SwaggerUIPlugin = (options?: SpicyInputOptions) => (system: any) => {
  const persistUserInputs = options?.persistUserInputs ?? true;

  // It is not certain whether this function is called multiple times, so it is made to be subscribed only once.
  if (!system.getSystem().spicyInput) {
    // Update inputs when state is changed.
    system.getStore().subscribe(() => {
      const inputs = inputsOfState(system.getState());
      const prevInputs = system.getSystem().spicyInputPrivateSelectors.inputs();
      if (fromJS(inputs).equals(fromJS(prevInputs))) {
        return;
      }
      system.getSystem().spicyInputPrivateActions.setInputs(inputs);
      const subscriptions = system.getSystem().spicyInputPrivateSelectors.subscriptions()
      subscriptions.forEach((callback: () => void) => {
        callback();
      })
    })
  }

  const afterLoad = !persistUserInputs ? undefined : (system: any) => {
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
          setParameters(path: string, method: string, value: any) {
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
          inputs: (_state: any) => system.getSystem().spicyInputPrivateSelectors.inputs(),
        },
      },
      spicyInputPrivate: {
        actions: {
          setInputs: (inputs: any) => {
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
            state: any,
            action: any
          ) => {
            return state.set("inputs", action.payload);
          },
          SPICY_INPUT_PRIVATE_ADD_SUBSCRIPTION: (
            state: any,
            action: any
          ) => {
            const subscriptions = state.get("subscriptions") ?? [];
            if (subscriptions.includes(action.payload)) {
              return state;
            }
            return state.set("subscriptions", [...(state.get("subscriptions") ?? []), action.payload])
          },
          SPICY_INPUT_PRIVATE_REMOVE_SUBSCRIPTION: (
            state: any,
            action: any
          ) => {
            return state.set("subscriptions", ((state.get("subscriptions") ?? []) as any[]).filter((item) => item !== action.payload))
          },
        },
        selectors: {
          inputs: (state: any) => state.get("inputs"),
          subscriptions: (state: any) => state.get("subscriptions") ?? [],
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
          Object.entries(fromJS(inputs).toJS()).forEach(([path, methodValues]: [string, any]) => {
            Object.entries(methodValues).forEach(([method, { parameters, bodyValue, requestContentType, responseContentType }]: [string, any]) => {
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
            })
          });
        }
      },
    },
  }
}

const getLocalStorageKey = (key: string) => {
  return `spicy-input/${key}`;
};
