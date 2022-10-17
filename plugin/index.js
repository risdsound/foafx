import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {el, resolve} from '@elemaudio/core';
import {default as core} from '@elemaudio/plugin-renderer';


import {defineTransform} from '../transform';


// Our main audio process render step
//
// We subscribe this function to the state store above to be invoked
// on any state change.
function renderFromStoreState(state) {
  let props = Object.assign({}, state, {
    key: 'harnessDefault',
  });

  const position = {
    azimuth: 0,
    elevation: 0,
    influence: 1.09
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
    renderFromStoreState({});
  }
});

// Kick off the interaction with the plugin backend
core.initialize();

// Mount the interface
function App(props) {
  return (
    <div>hi</div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
