import React, { useState } from 'react';
import {createRoot}  from 'react-dom/client';
import {el, resolve} from '@elemaudio/core';
import {default as core} from '@elemaudio/plugin-renderer';
import {defineTransform} from '../transform';
import EffectSelect from './EffectSelect';

import createHooks from 'zustand'
import createStore from 'zustand/vanilla'

import manifest from './manifest.json';
import { bitcrush } from '../effects/bitcrush';
import { chorus } from '../effects/chorus';
import { distortion } from '../effects/distortion';
import { flanger } from '../effects/flanger';
import { gain } from '../effects/gain';


// Initial state management
const store = createStore(() => {
  return {
    influence: Math.sqrt(2),
    effectId: 3,
    ...manifest.parameters.reduce((acc, param) => {
      return Object.assign(acc, {
        [param.paramId]: param.defaultValue,
      });
    }, {}),
  };
});

const useStore = createHooks(store);

// Audio effect helper
function getEffectDefinition(state) {
  switch (state.effectId) {
    case 1: // Gain
      return (x) => gain({key: 'gg', gainDecibels: (64 * state.gain) - 32}, x);
    case 2: // Chorus
      return (x) => chorus({key: 'ch', rate: 10 * state.chorusRate, depth: 10 + 30 * state.chorusDepth}, x);
    case 3: // Flanger
      return (x) => flanger({key: 'fl', rate: 2 * state.flangerRate, depth: 1 + 19 * state.flangerDepth, feedback: 0.999 * (2 * state.flangerFbk - 1)}, x);
    case 4: // Bitcrush
      return (x) => bitcrush({key: 'bc', bitDepth: 2 + 14 * state.bitDepth}, x);
    case 5: // Distortion
      return (x) => distortion({key: 'di', inputGain: (64 * state.distInputGain) - 32, outputGain: (64 * state.distOutputGain) - 32}, x);
    case 6:
    default:
      return (x) => x;
  }
}

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

  const effect = getEffectDefinition(state);

  console.log(core.render(...defineTransform('sn3d', position, effect, [
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
    <div className="h-full w-full bg-slate-200">
      <div className="w-full h-6 bg-gray-800 flex items-center justify-between px-4 py-6">
        <h1 className="text-lg font-semibold text-gray-200">FOAFX</h1>
        <h1 className="text-sm text-gray-200">SRST</h1>
      </div>
      <div className="w-full flex">
        <EffectSelect
          className="flex-initial"
          selected={state.effectId}
          setSelectedEffect={(id) => store.setState({effectId: id})} />
        <table className="ml-8 table-fixed flex-1">
          <tbody>
            {manifest.parameters.map((param, i) => {
              return (
                <tr key={param.paramId} className={i % 2 === 0 ? 'bg-slate-300' : 'bg-slate-200'}>
                  <td className="p-1 text-sm">{param.name}</td>
                  <td className="p-1 text-sm">{state[param.paramId].toFixed(1)}</td>
                  <td className="p-1 text-sm">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.001"
                      value={state[param.paramId]}
                      onChange={(e) => requestParamValueUpdate(param.paramId, parseFloat(e.target.value))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
