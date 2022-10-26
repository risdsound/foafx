import { Wavefile } from 'wavefile';
import { readFileSync } from 'fs';

import * as jshlib from 'spherical-harmonic-transform';

import { el } from '@elemaudio/core';


// A quick helper function for reading wav files into Float32Array buffers
export function decodeAudioData(path) {
  const wav = new WaveFile(readFileSync(path));
  const bitRate = wav.fmt.bitsPerSample;
  const sampleRate = wav.fmt.sampleRate;
  const channelData = wav.getSamples().map(function(chan) {
    return Float32Array.from(chan, x => x / (2 ** (bitRate - 1)));
  });

  return {
    bitRate,
    sampleRate,
    channelData,
  };
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

  return encode(normType, pos, decode(normType, pos, ...inTaps).map((vMicSignal, i) => {
    let wet = effect(vMicSignal);
    let dry = vMicSignal;
    let d = distance(pol2car(pos[i]), pol2car([position.azimuth, position.elevation]));

    let mix = d <= position.influence ? 1.0 : 0.0;
    let key = `mix:${pos[i][0]}:${pos[i][1]}`;

    console.log(key, mix, d);
    return el.select(el.sm(el.const({key, value: mix})), wet, dry);
  }));
}
