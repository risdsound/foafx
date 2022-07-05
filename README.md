## Description

**foafx** is a command line tool for applying spatially positioned audio effects to first order ambisonic sound files.  It is written with [Elementary](https://www.elementary.audio/), a JavaScript framework for writing audio applications, and uses its [offline-renderer](https://www.elementary.audio/docs/packages/offline-renderer) package.

As its input, **foafx** expects a B-format, 4-channel first order ambisonic encoded file with ACN channel ordering.  It supports file normalization either in SN3D or N3D formats.

In order to apply a chosen effect, **foafx** decodes the B-format file using a simple Sampling Ambisonic Decoder (SAD) into an octahedral arrangement with six vertices that represent virtual microphone positions.  Then, the effect is applied with the specified parameters including its spatial position (azimuth and elevation).  After effect processing, the six signals are encoded back to B-format, panned to the matching octahedral positions of the decoder, and rendered to an output file.  The result is an ambisonic wet/dry effect mix with wet focussed in a specific area of the sound field.

Because **foafx** impacts a region of the sound field, based on azimuth, elevation, and influence parameters, multiple processing passes may be required to achieve a fully encompassing effect, which with varied parameters can yield compelling results that interact with the spatial aspects of the source file.  With this in mind, there are six regions of consequence based on the octahedral decoder. In azimuth/elevation pairs (in degrees) these are:

[0, 0], [90, 0], [180, 0], [270, 0], [0, 90], [0, -90]

FRONT, LEFT, BACK, RIGHT, UP, DOWN

By running an effect (or different effects) consecutively at each of these or equidistant coordinates, the entire sound field will be altered.

## Installation

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

### Position

* `azimuth`, in degrees
* `elevation`, in degrees
* `influence` in the range [0, 1]

### Effects

* Bitcrush
    * `bitDepth` – Default 5, Min 1, Max 16
* Distortion
    * `inputGain` – Default 20, Min -32, Max 32
    * `outputGain` – Default 20, Min -32, Max 32
* Delay
    * `delayTime` – Default 500ms, Min 0, Max 10,000
    * `feedback` – Default 0.8, Min 0, Max 0.999
* Flanger
    * `rate` – Default 0.2Hz, Min 0, Max 20,000
    * `depth` – Default 0.8, Min 1, Max 20
    * `feedback` – Default 0.8, Min -0.999, Max 0.999
* Chorus
    * `rate` – Default 0.5Hz, Min 0, Max 20,000
    * `depth` – Default 40, Min 10, Max 100
* Gain
    * `gainDecibels` – Default 0dB, Min -32, Max 32

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
  "bitcrush": {
    "bitDepth": 5,
    "position": {
      "azimuth": 0,
      "elevation": 0,
      "influence": 0.5
    }
  },
  "distortion": {
    "inputGain": 20,
    "outputGain": -10,
    "position": {
      "azimuth": 0,
      "elevation": 0,
      "influence": 0.5
    }
  },
  "delay": {
    "delayTime": 500,
    "feedback": 0.8,
    "position": {
      "azimuth": 90,
      "elevation": 0,
      "influence": 0.5
    }
  },
  "flanger": {
    "rate": 0.2,
    "depth": 3.5,
    "feedback": 0.4,
    "position": {
      "azimuth": -90,
      "elevation": 0,
      "influence": 0.5
    }
  },
  "chorus": {
    "rate": 0.5,
    "depth": 40,
    "position": {
      "azimuth": -90,
      "elevation": 0,
      "influence": 0.5
    }
  },
  "gain": {
    "gainDecibels": 0,
    "position": {
      "azimuth": 0,
      "elevation": 0,
      "influence": 0.5
    }
  }
}
```


## Credits 

Nick Thompson, Elementary Audio, LLC\

Studio for Research in Sound and Technology, Rhode Island School of Design\
* Shawn Greenlee, Faculty Lead\
* Mark Araujo, Research Assisant\
* Caleb Shafer, Research Assisant\
* Femi Shonuga-Fleming, Research Assisant\

This project is supported in part by an award from the [National Endowment for the Arts](https://www.arts.gov/). To find out more about how National Endowment for the Arts grants impact individuals and communities, visit [www.arts.gov](https://www.arts.gov/).

![NEA logo](https://www.arts.gov/sites/default/files/2018-Square-Logo-with-url.png)

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
