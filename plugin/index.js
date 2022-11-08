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
import { delay } from '../effects/delay';
import { distortion } from '../effects/distortion';
import { flanger } from '../effects/flanger';
import { gain } from '../effects/gain';


// Initial state management
const store = createStore(() => {
  return {
    influence: Math.sqrt(2) / 2,
    effectId: 1,
    ...manifest.parameters.reduce((acc, param) => {
      return Object.assign(acc, {
        [param.paramId]: param.defaultValue,
      });
    }, {}),
  };
});

const useStore = createHooks(store);

// Helpers for parameter values and readouts
function linscale(x, min, max, outMin, outMax) {
  let a = (x - min) / (max - min);
  return outMin + a * (outMax - outMin);
}

function logscale(x, min, max, outMin, outMax) {
  let a = (x - min) / (max - min);
  return outMin + (a * a) * (outMax - outMin);
}

function pct(x) {
  return `${Math.round(linscale(x, 0, 1, 0, 100))}%`;
}

const valueMapFns = {
  gain: (x) => linscale(x, 0, 1, -96, 12),
  bitDepth: (x) => linscale(x, 0, 1, 3, 16),
  chorusRate: (x) => logscale(x, 0, 1, 0.001, 10),
  chorusDepth: (x) => logscale(x, 0, 1, 10, 30),
  flangerRate: (x) => logscale(x, 0, 1, 0.001, 4),
  flangerDepth: (x) => logscale(x, 0, 1, 0.001, 7),
  flangerFbk: (x) => linscale(x, 0, 1, 0.0, 0.99),
  distInputGain: (x) => linscale(x, 0, 1, -36, 36),
  distOutputGain: (x) => linscale(x, 0, 1, -12, 12),
  delayTime: (x) => logscale(x, 0, 1, 0.001, 5000),
  delayFeedback: (x) => linscale(x, 0, 1, 0.0, 0.99),
};

const valueReadoutFns = {
  gain: (x) => `${valueMapFns.gain(x).toFixed(1)}dB`,
  bitDepth: (x) => `${Math.round(valueMapFns.bitDepth(x))}`,
  chorusRate: (x) => `${valueMapFns.chorusRate(x).toFixed(1)}Hz`,
  chorusDepth: (x) => `${valueMapFns.chorusDepth(x).toFixed(1)}ms`,
  flangerRate: (x) => `${valueMapFns.flangerRate(x).toFixed(1)}Hz`,
  flangerDepth: (x) => `${valueMapFns.flangerDepth(x).toFixed(1)}ms`,
  flangerFbk: (x) => pct(valueMapFns.flangerFbk(x)),
  distInputGain: (x) => `${valueMapFns.distInputGain(x).toFixed(1)}dB`,
  distOutputGain: (x) => `${valueMapFns.distOutputGain(x).toFixed(1)}dB`,
  delayTime: (x) => `${valueMapFns.delayTime(x).toFixed(1)}ms`,
  delayFeedback: (x) => pct(valueMapFns.delayFeedback(x)),
  azimuth: (x) => `${(360 * x).toFixed(1)}deg`,
  elevation: (x) => `${(360 * x).toFixed(1)}deg`,
  influence: (x) => x.toFixed(1),
};

// Audio effect helper
function getEffectDefinition(state) {
  switch (state.effectId) {
    case 1:
      return (x) => gain({
        key: 'gg',
        gainDecibels: valueMapFns.gain(state.gain),
      }, x);
    case 2:
      return (x) => chorus({
        key: 'ch',
        rate: valueMapFns.chorusRate(state.chorusRate),
        depth: valueMapFns.chorusDepth(state.chorusDepth),
      }, x);
    case 3:
      return (x) => flanger({
        key: 'fl',
        rate: valueMapFns.flangerRate(state.flangerRate),
        depth: valueMapFns.flangerDepth(state.flangerDepth),
        feedback: valueMapFns.flangerFbk(state.flangerFbk),
      }, x);
    case 4:
      return (x) => bitcrush({
        key: 'bc',
        bitDepth: valueMapFns.bitDepth(state.bitDepth),
      }, x);
    case 5:
      return (x) => distortion({
        key: 'di',
        inputGain: valueMapFns.distInputGain(state.distInputGain),
        outputGain: valueMapFns.distOutputGain(state.distOutputGain),
      }, x);
    case 6:
      return (x) => delay({
        key: 'de',
        delayTime: valueMapFns.delayTime(state.delayTime),
        feedback: valueMapFns.delayFeedback(state.delayFeedback),
      }, x);
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
                  <td className="p-1 text-sm w-36">{param.name}</td>
                  <td className="p-1 text-sm w-36">{valueReadoutFns[param.paramId](state[param.paramId])}</td>
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
