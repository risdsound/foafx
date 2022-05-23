import wavefile from 'wavefile';
import { readFileSync, writeFileSync } from 'fs';

import * as jshlib from 'spherical-harmonic-transform';

import OfflineRenderer from '@elemaudio/offline-renderer';
import { el } from '@elemaudio/core';


// A quick helper function for reading wav files into Float32Array buffers
export function decodeAudioData(path) {
  const wav = new wavefile.WaveFile(readFileSync(path));
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
export function ambipan(order, azim, elev, xn) {
  let gains = jshlib.computeRealSH(order, [
    [azim * Math.PI / 180, elev * Math.PI / 180],
  ]);

  return gains.map(function(g, i) {
    let gain = g[0];

    // By default, the spherical harmonic transform library here yields coefficients
    // normalized in N3D. If the user asking for SN3D we convert here.
    // if (norm === "sn3d") {
    //   gain = gain / Math.sqrt(2 * i + 1);
    // }

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
export function decode(pos, w, y, z, x) {
  // Map to radians
  const posRad = pos.map(([a, e]) => [a * Math.PI / 180, e * Math.PI / 180]);

  // Decoding...
  //
  // This works for N3D inputs, we need to scale the first-order components by sqrt(3).
  // If our input is in SN3D we need to add a second sqrt(3) factor here.
  //
  // P_n = W + sqrt(3) * (X * cos(theta_n) * cos(phi_n) + Y * sin(theta_n) * cos(phi_n) + Z * sin(phi_n))
  return posRad.map(([azim, elev]) => (
    el.mul(
      1 / posRad.length,
      el.add(
        w,
        el.mul(Math.sqrt(3), x, Math.cos(azim), Math.cos(elev)),
        el.mul(Math.sqrt(3), y, Math.sin(azim), Math.cos(elev)),
        el.mul(Math.sqrt(3), z, Math.sin(elev)),
      ),
    )
  ));
}

// Encodes a set of processed virtual mic signals back into FOA B-Format
// by setting each signal to its appropriate place on the sphere and
// summing the resulting W, Y, Z, X channels.
export function encode(pos, inputs) {
  const bSignals = zip(pos, inputs).map(([[azim, elev], signal]) => {
    return ambipan(1, azim, elev, signal);
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

// Our main transform function.
//
// Takes an input file, an effect function, and a desired output
// path for the resulting wav file.
//
// The effect function is an Elementary function which receives
// an input channel, performs some process over it, and returns
// the output. This function should operate over a single channel.
//
// The position is an object specifying azimuth, elevation, and influence
// relating to the effect. The effect is 100% wet at the specified position
// in the virtual sphere, and 100% dry outside of the sphere of influence around
// that point. The sphere of influence is specified by the influence property
// which defines the radius of the sphere. The virtual sphere in which the sphere
// of influence sits is defined as a unit sphere.
export async function transform(inputFile, position, effect, outputPath) {
  let core = new OfflineRenderer();
  let inputData = decodeAudioData(inputFile);
  let outputWav = new wavefile.WaveFile();

  await core.initialize({
    numInputChannels: inputData.channelData.length,
    numOutputChannels: inputData.channelData.length,
    sampleRate: inputData.sampleRate,
  });

  // Our sample data for processing.
  let inps = inputData.channelData;
  let outs = Array.from({length: inps.length}).map(_ => new Float32Array(inps[0].length));;

  // Our processing transformation
  //
  // For first order processing, we're just using the spatial positions of a
  // default octahedron decoder. These are [azim, elev] pairs in degrees.
  const pos = [ [0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90] ];
  const inTaps = inps.map((x, i) => el.in({channel: i}));

  core.render(...encode(pos, decode(pos, ...inTaps).map((vMicSignal, i) => {
    let wet = effect(vMicSignal);
    let dry = vMicSignal;
    let d = distance(pol2car(pos[i]), pol2car([position.azimuth, position.elevation]));

    // TODO: Could map smoothly here between 0, 1
    let mix = d > position.influence ? 0 : 1;

    return el.select(mix, wet, dry);
  })));

  // Pushing samples through the graph
  core.process(inps, outs);

  // Fill our output wav buffer with the process data and write to disk.
  // Here we convert back to 16-bit PCM before write.
  outputWav.fromScratch(inps.length, inputData.sampleRate, '16', outs.map((chan) => {
    return Int16Array.from(chan, x => x * (2 ** 15));
  }));

  writeFileSync(outputPath, outputWav.toBuffer());
}
