import * as jshlib from 'spherical-harmonic-transform';

import { el } from '@elemaudio/core';


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
    // normalized in N3D. If the user asking for SN3D we convert here.
    if (normType === "sn3d") {
      gain = gain / Math.sqrt(2 * i + 1);
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
  // Map to radians
  const posRad = pos.map(([a, e]) => [a * Math.PI / 180, e * Math.PI / 180]);

  // Decoding:
  //
  // P_n = W + sqrt(3) * (X * cos(theta_n) * cos(phi_n) + Y * sin(theta_n) * cos(phi_n) + Z * sin(phi_n))
  //
  // For N3D input normalization, we need to scale the first-order components here
  // by sqrt(3). For SN3D input normalization, we need an additional sqrt(3) factor.
  const normFactor = (normType === "sn3d") ? Math.sqrt(3) * Math.sqrt(3) : Math.sqrt(3);

  return posRad.map(([azim, elev]) => (
    el.mul(
      1 / posRad.length,
      el.add(
        w,
        el.mul(normFactor, x, Math.cos(azim), Math.cos(elev)),
        el.mul(normFactor, y, Math.sin(azim), Math.cos(elev)),
        el.mul(normFactor, z, Math.sin(elev)),
      ),
    )
  ));
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

// Polar coordinate to cartesian coordinate helper
function pol2car ([theta, phi]) {
  let radius = 1; // unit circle
  let x = radius * Math.cos(theta * Math.PI / 180);
  let y = radius * Math.sin(theta * Math.PI / 180);
  let z = radius * Math.sin(phi * Math.PI / 180);

  return [x, y, z];
}

// Euclidean distance helper
function distance([x1, y1, z1], [x2, y2, z2]) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (z2 - z1) * (z2 - z1));
}

export function defineTransform(normType, position, effect, inTaps) {
  const pos = [ [0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90] ];
  const deg2rad = (deg) => deg * Math.PI / 180;

  const cosAzim = Math.cos(deg2rad(position.azimuth));
  const sinAzim = Math.sin(deg2rad(position.azimuth));
  const cosElev = Math.cos(deg2rad(position.elevation));
  const sinElev = Math.sin(deg2rad(position.elevation));

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

    console.log(key, mix);
    return el.select(el.sm(el.const({key, value: mix})), wet, dry);
  }));
}
