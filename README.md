## Description

**foafx** is a command line tool for applying spatially positioned audio effects to first order ambisonic sound files.  It is written with [Elementary](https://www.elementary.audio/), a JavaScript framework for writing audio applications, and uses its [offline-renderer](https://www.elementary.audio/docs/packages/offline-renderer) package.

As its input, **foafx** expects a B-format, 4-channel first order ambisonic encoded file with ACN channel ordering.  It supports file normalization either in SN3D or N3D formats.

In order to apply a chosen effect, **foafx** decodes the B-format file using a simple Sampling Ambisonic Decoder (SAD) into an octahedral arrangement with six vertices that represent virtual microphone positions.  Then, the effect is applied with the specified parameters including its spatial position (azimuth and elevation).  After effect processing, the six signals are encoded back to B-format, panned to the matching octahedral positions of the decoder, and rendered to an output file.  The result is an ambisonic wet/dry effect mix with wet focussed in a specific area of the sound field.

Because **foafx** impacts a region of the sound field, based on the azimuth and elevation parameters, multiple processing passes may be required to achieve a fully encompassing effect, which with varied parameters can yield compelling results that interact with the spatial aspects of the source file.  With this in mind, there are six regions of consequence based on the octahedral decoder. In azimuth/elevation pairs (in degrees) these are:

[0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90]

FRONT, LEFT, BACK, RIGHT, UP, DOWN

By running an effect (or different effects) consecutively at each of these or equidistant coordinates, the entire sound field will be altered.

## Installation

**foafx** is a [Node.js](https://nodejs.org/en/) program distributed on npm. Therefore, before installing **foafx** you must first install Node.js, for which
we recommend [nvm](https://github.com/nvm-sh/nvm).

With Node.js installed, you can install **foafx** as a global command line tool as follows,

```bash
npm install -g foafx
```

## Use

```bash
Usage: foafx [options] [command]

Options:
  -n, --norm <type>                  Either "n3d" or "sn3d" matching the input file encoding
  -c, --config <path>                Load a configuration file to override the default parameter settings
  -h, --help                         display help for command

Commands:
  bitcrush <inputFile> <outputPath>  Run the bitcrusher spatial audio effect over the input file
  distort <inputFile> <outputPath>   Run the distortion spatial audio effect over the input file
  delay <inputFile> <outputPath>     Run the delay spatial audio effect over the input file
  flange <inputFile> <outputPath>    Run the flanger spatial audio effect over the input file
  chorus <inputFile> <outputPath>    Run the chorus spatial audio effect over the input file
  gain <inputFile> <outputPath>      Run the gain spatial audio effect over the input file
  help [command]                     display help for command
```

## Parameter ranges

### Global

* `dryLevel`, in Decibels – Default 0, Min -96, Max 0
    * Setting dryLevel below 0dB allows you to attenuate the dry signal in those regions of the sphere where
      the desired effect is not located, allowing for something of a "spotlight" effect.

### Position

* `azimuth`, in degrees
* `elevation`, in degrees

### Effects

* Bitcrush
    * `bitDepth` – Default 5, Min 3, Max 16
* Distortion
    * `inputGain` – Default 20, Min -32, Max 32
    * `outputGain` – Default -10, Min -12, Max 12
* Delay
    * `delayTime` – Default 500ms, Min 0.001ms, Max 5000ms
    * `feedback` – Default 0.8, Min 0, Max 0.999
* Flanger
    * `rate` – Default 0.2Hz, Min 0.001Hz, Max 4Hz
    * `depth` – Default 3.5ms, Min 0.001ms, Max 7ms
    * `feedback` – Default 0.4, Min -0.999, Max 0.999
* Chorus
    * `rate` – Default 0.5Hz, Min 0.001Hz, Max 10Hz
    * `depth` – Default 20ms, Min 10ms, Max 30ms
* Gain
    * `gainDecibels` – Default 0dB, Min -96dB, Max +12dB

## Sample config file

A config file can be specified at the command line for providing parameter values for the given
effects and the position at which the effect should occur. The following example shows a config file
with specifications for every available parameter for every available effect. The config file can be
loaded at the command line using the `-c` flag.

```bash
foafx bitcrush -n n3d -c config.json input.wav output.wav
```

```json
{
  "dryLevel": 0,
  "bitcrush": {
    "bitDepth": 5,
    "position": {
      "azimuth": 0,
      "elevation": 0
    }
  },
  "distortion": {
    "inputGain": 20,
    "outputGain": -10,
    "position": {
      "azimuth": 0,
      "elevation": 0
    }
  },
  "delay": {
    "delayTime": 500,
    "feedback": 0.8,
    "position": {
      "azimuth": 90,
      "elevation": 0
    }
  },
  "flanger": {
    "rate": 0.2,
    "depth": 3.5,
    "feedback": 0.4,
    "position": {
      "azimuth": -90,
      "elevation": 0
    }
  },
  "chorus": {
    "rate": 0.5,
    "depth": 40,
    "position": {
      "azimuth": -90,
      "elevation": 0
    }
  },
  "gain": {
    "gainDecibels": 0,
    "position": {
      "azimuth": 0,
      "elevation": 0
    }
  }
}
```


## Credits

Created at the [Studio for Research in Sound and Technology ](https://sound.risd.edu) (SRST), Rhode Island School of Design (RISD)

Project team:
* Shawn Greenlee, Faculty Lead
* Nick Thompson, Elementary Audio LLC
* Mark Araujo, Research Assistant
* Caleb Shafer, Research Assistant
* Femi Shonuga-Fleming, Research Assistant

This project is supported in part by an award from the [National Endowment for the Arts](https://www.arts.gov/). To find out more about how National Endowment for the Arts grants impact individuals and communities, visit [www.arts.gov](https://www.arts.gov/).

<img src="https://user-images.githubusercontent.com/2341558/177417763-76e30845-6f6f-4be8-9ea8-ba6970576a9f.png" width="200"> &nbsp; &nbsp; <img src="https://user-images.githubusercontent.com/2341558/207156722-95ff666a-beef-4c8d-8964-cf074f8f1b78.png" width="190">

## License

Copyright (c) 2022 Rhode Island School of Design

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
