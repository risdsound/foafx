import React, { useState } from 'react';
import { createRoot}  from 'react-dom/client';
import {el, resolve} from '@elemaudio/core';
import {default as core} from '@elemaudio/plugin-renderer';
import {defineTransform} from '../transform';

import createHooks from 'zustand'
import createStore from 'zustand/vanilla'


// Initial state management
const store = createStore(() => {
  return {
    azimuth: 0,
    elevation: 0,
    influence: Math.sqrt(2),
  };
});

const useStore = createHooks(store);

// Our main audio process render step
//
// We subscribe this function to the state store above to be invoked
// on any state change.
function renderFromStoreState(state) {
  const position = {
    azimuth: 360 * state.azimuth,
    elevation: 360 * state.elevation,
    influence: state.influence,
  };

  console.log(core.render(...defineTransform('sn3d', position, (x) => el.mul(0, x), [
    el.in({channel: 0}),
    el.in({channel: 1}),
    el.in({channel: 2}),
    el.in({channel: 3}),
  ])));
}

// Establish our connection from host state events to local state
core.on('parameterValueChange', function(e) {
  if (store.getState().hasOwnProperty(e.paramId)) {
    store.setState(Object.assign({}, store.getState(), {
      [e.paramId]: e.value,
    }));
  }
});

// Error reporting
core.on('error', function(e) {
  console.error(e);
});

let renderSubscription = null;
let persistenceSubscription = null;

// On load we establish our render on state change relationship
// and kick off with the initial render, either from persisted host
// state or from default store state.
core.on('load', function(e) {
  // Unsubscribe if this is a second load event
  if (renderSubscription) { renderSubscription(); }
  if (persistenceSubscription) { persistenceSubscription(); }

  renderSubscription = store.subscribe(renderFromStoreState);
  persistenceSubscription = store.subscribe((state) => queueMicrotask(() => core.dispatch('saveState', JSON.stringify(store.getState()))));

  // Here we also set up bindings for state persistence with the host
  core.on('loadState', (e) => {
    if (typeof e.value === 'string' && e.value.length > 0) {
      console.log('Received load state event');

      try {
        store.setState(JSON.parse(e.value));
      } catch (err) {
        console.error('Failed parsing host state', err, e.value);
      }
    }
  });

  let loadState = null;

  if (typeof e.state === 'string' && e.state.length > 0) {
    try {
      loadState = JSON.parse(e.state);
    } catch (err) {
      console.error('Failed parsing load state', err, e.state);
    }
  }

  // If the load event has state provided by the host, we update our
  // store and the render call will cascade from that. Else, we make sure
  // to kick off the initial render with the default store state.
  if (loadState) {
    store.setState(loadState);
  } else {
    renderFromStoreState(store.getState());
  }
});

// Kick off the interaction with the plugin backend
core.initialize();

// Mount the interface
function App(props) {
  let state = useStore();

  let requestStateUpdate = (callback) => store.setState(callback(state));
  let requestParamValueUpdate = (name, value) => core.dispatch('setParameterValue', {name, value});

  return (
    <div className="h-full w-full p-4 bg-slate-400">
      <h1 className="text-lg font-semibold">FOAFX</h1>
      <table class="table-fixed w-full">
        <tbody>
          <tr>
            <td>Azimuth</td>
            <td>{(360 * state.azimuth).toFixed(1)}deg</td>
            <td>
              <input type="range" min="0" max="1" step="0.001" value={state.azimuth} onChange={(e) => requestParamValueUpdate('azimuth', parseFloat(e.target.value))} />
            </td>
          </tr>
          <tr>
            <td>Elevation</td>
            <td>{(360 * state.elevation).toFixed(1)}deg</td>
            <td>
              <input type="range" min="0" max="1" step="0.001" value={state.elevation} onChange={(e) => requestParamValueUpdate('elevation', parseFloat(e.target.value))} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
