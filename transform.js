import * as jshlib from 'spherical-harmonic-transform';

import { el } from '@elemaudio/core';


// Evaluate the nth Legendre polynomial at x using Bonnet's
// recursion formula
//
// We're not actually using this for the first order case (see the
// decoder function comments on the maxRE weighting), but I'll leave
// it in in anticipation of future work extending this project to higher
// order ambisonics.
function P(n, x) {
  if (n === 0)
    return 1;
  if (n === 1)
    return x;

  const n1 = ((2 * n) - 1) * x * P(n - 1, x);
  const n2 = (n - 1) * P(n - 2, x);

  return (n1 - n2) / n;
}

// This function encodes a mono point source with a given azimuth and
// elevation into an Nth order HOA channel array.
//
// Order, azim, and elev are all expected to be primitive numbers. Azim
// and elev are in degrees, not radians. The return value is an array of
// elementary nodes of length (order + 1)^2.
export function ambipan(normType, order, azim, elev, xn) {
  let gains = jshlib.computeRealSH(order, [
    [azim * Math.PI / 180, elev * Math.PI / 180],
  ]);

  return gains.map(function(g, i) {
    let gain = g[0];

    // By default, the spherical harmonic transform library here yields coefficients
    // normalized in N3D. If the user asking for SN3D we convert here by scaling
    // the directional components of the output signal
    //
    // NOTE: This scaling is correct only for first order ambisonic encoding.
    if ((i > 0) && normType === "sn3d") {
      gain = gain / Math.sqrt(3);
    }

    return el.mul(gain, xn);
  });
}

// A simple helper for list processing
export function zip(a, b) {
  if (a.length !== b.length)
    throw new Error('yikes');

  return a.map((x, i) => [x, b[i]]);
}

// Decode from First Order Ambisonics to a series of virtual mic signals
// using a simple SAD decoder.
export function decode(normType, pos, w, y, z, x) {
  let chans = [w, y, z, x];

  // The literature for encoding and decoding generally keeps everything in N3D,
  // so if we receive SN3D we first convert back to N3D by scaling the directional
  // components of the input signal
  if (normType === "sn3d") {
    chans = [
      w,
      el.mul(Math.sqrt(3), y),
      el.mul(Math.sqrt(3), z),
      el.mul(Math.sqrt(3), x),
    ];
  }

  return pos.map(([azim, elev]) => {
    let gains = jshlib.computeRealSH(1, [
      [azim * Math.PI / 180, elev * Math.PI / 180],
    ]);

    // Max rE weighting for the first-order directional components
    //
    // We would normally use P_i(x) where x is the cos approximation below,
    // but P_0(x) == 1 so our omni component (w) stays at unity gain, then
    // we have P_1(x) == x, so for these first order directional components (y, z, x)
    // we can simply evaluate the cos approximation and apply it below.
    //
    // See:
    // * https://github.com/polarch/Higher-Order-Ambisonics/blob/master/getMaxREweights.m#L26
    let re = Math.cos(137.9 * Math.PI / 180 / (1 + 1.51));

    return el.mul(
      // The literature suggests a (4*Pi/L) scaling factor, but since we know that we're going to re-encode
      // to B-Format right after the intermediate transformation, we're seeking a decoding/encoding matrix
      // pair with A * A^T == I. So we adjust the weighting here just to (1/L) in an effort to maximally
      // preserve the original input signal through the transformation.
      //
      // See:
      //  * https://www.aes.org/tmpFiles/elib/20221128/16554.pdf
      //  * https://www.aes.org/e-lib/browse.cfm?elib=16554
      1 / pos.length,
      el.add(...gains.map(function(g, j) {
        if (j > 0) {
          return el.mul(g[0] * re, chans[j]);
        }

        return el.mul(g[0], chans[j]);
      })),
    );
  });
}

// Encodes a set of processed virtual mic signals back into FOA B-Format
// by setting each signal to its appropriate place on the sphere and
// summing the resulting W, Y, Z, X channels.
export function encode(normType, pos, inputs) {
  const bSignals = zip(pos, inputs).map(([[azim, elev], signal]) => {
    return ambipan(normType, 1, azim, elev, signal);
  });

  return bSignals.reduce((acc, next) => {
    let [aw, ay, az, ax] = acc;
    let [nw, ny, nz, nx] = next;

    return [
      el.add(aw, nw),
      el.add(ay, ny),
      el.add(az, nz),
      el.add(ax, nx),
    ]
  }, [0, 0, 0, 0]);
}

export function defineTransform(normType, position, effect, dryLevel, inTaps) {
  const pos = [ [0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90] ];
  const deg2rad = (deg) => deg * Math.PI / 180;

  const cosAzim = Math.cos(deg2rad(position.azimuth));
  const sinAzim = Math.sin(deg2rad(position.azimuth));
  const cosElev = Math.cos(deg2rad(position.elevation));
  const sinElev = Math.sin(deg2rad(position.elevation));

  const db2gain = (db) => Math.pow(10, db / 20);
  const dryGain = el.const({key: 'dryGain', value: db2gain(Math.min(0, Math.max(-96, dryLevel)))});

  return encode(normType, pos, decode(normType, pos, ...inTaps).map((vMicSignal, i) => {
    let wet = effect(vMicSignal);
    let dry = vMicSignal;
    let key = `mix:${pos[i][0]}:${pos[i][1]}`;
    let mix = 0;

    // This is roughly a sine panning law adapted for three dimensional space,
    // using both azimuth and elevation to derive a gain coefficient
    switch (key) {
      case 'mix:0:0':
        mix = cosElev * cosAzim;
        break;
      case 'mix:90:0':
        mix = cosElev * sinAzim;
        break;
      case 'mix:180:0':
        mix = -1 * cosElev * cosAzim;
        break;
      case 'mix:270:0':
        mix = -1 * cosElev * sinAzim;
        break;
      case 'mix:0:90':
        mix = sinElev;
        break;
      case 'mix:0:-90':
        mix = -1 * sinElev;
        break;
    }

    // Prevent phase inversion
    mix = Math.max(0, mix);
    return el.select(el.sm(el.const({key, value: mix})), wet, el.mul(dryGain, dry));
  }));
}
