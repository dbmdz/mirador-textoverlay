# mirador-textoverlay

[![npm package][npm-badge]][npm]
[![required Mirador version][mirador-badge]][mirador]

**A Mirador 3 plugin to display a selectable text overlay based on OCR or transcriptions.**

[![Screenshot][screenshot]][demo]
**[Demo on https://mirador-textoverlay.netlify.com][demo]** (try selecting some text)

## Requirements for supported IIIF manifests

- Line-level annotations with either one of:
  - a `motivation` that is `supplementing` (IIIF v3)
  - a resource that has a `@type` that is `cnt:contentAsText`  (IIIF v2)
  - a `dcType` that is equal to `Line` (Europeana)
- A per-canvas `seeAlso` entry pointing to the ALTO or hOCR OCR markup for
  the page with either:
  - A `format` that is `application/xml+alto` or `text/vnd.hocr+html`
  - A `profile` starting with `http://www.loc.gov/standards/alto/`,
  `http://kba.cloud/hocr-spec`, `http://kba.github.io/hocr-spec/` or
  `https://github.com/kba/hocr-spec/blob/master/hocr-spec.md`
- If using OCR markup, the plugin can handle arbitrary scaling factors, i.e.
as long as the OCR matches the canvas it should render fine

For a list of example manifests that are supported, refer to the `catalog`
entry in the [demo instance configuration][demo-cfg-catalog]. If you need
support for your particular flavor of attaching text to a IIIF canvas, open
an issue :-)


## Installation
Currently the plugin can only be used if you build your own Mirador JavaScript bundle.
To include the plugin in your Mirador installation, you need to install it
from npm with `npm install mirador-textoverlay`, import it into your project
and pass it to Mirador when you instantiate the viewer:

```javascript
import Mirador from 'mirador/dist/es/src/index';
import textOverlayPlugin from 'mirador-textoverlay/es';

const miradorConfig = {
  // Your Mirador configuration
}
Mirador.viewer(config, [...textOverlayPlugin]);
```

## Configuration
You can configure the plugin globally for all windows and/or individually for
every window.

For global configuration add the `textOverlay` entry to the top-level
`window` configuration (globally for all windows) or to the individual window
object:

```javascript
const miradorConfig = {
  window: {
    // ....
    textOverlay: {
      // Global options for all windows, see available settings below
    },
  },
  windows: [{
    // ....
    textOverlay: {
      // Options for an individual window, see available settings below
    },
  }, // ...
}
```

You can view an example configuration in [demo/src/index.js][demo-cfg].

The available configuration options (all of which define defaults that can be
changed through the UI, except for `enabled` and `fontFamily`) are:

- `enabled`: If the plugin is enabled. Boolean, defaults to `true`.
- `selectable`: Set default text selectability. Boolean, defaults to `false`.
- `visible`: Set default text visibility. Boolean, defaults to `false`.
- `opacity`: Default opacity of the visible text. Number between `0` and `1`,
  defaults to `1.0`
- `useAutoColors`: Try to determine fitting text and background colors from
  the page image itself.<br>
  Falls back to `textCololor`/`bgColor` if
  auto-detection fails (e.g. due to missing CORS headers).<br>
  Boolean, defaults
  to `true`.
- `textColor`: Set default text color. RGB color string, defaults to
  `#000000` (black)
- `bgColor`: Set default text background color. RGB color string, defaults to
  `#ffffff` (white)

The plugin also supports theming for a few things, these can be set under the
`textOverlay` section for the light and/or dark theme (see
[Mirador 3 Theming](https://github.com/ProjectMirador/mirador/wiki/M3-Theming-Mirador)
on how to set these values):

- `overlayFont`: Font(s) to use for rendering text. Any valid `font-family` CSS value
- `selectionTextColor`: Color to use for rendering text when part of a selection. Any legal CSS color value.
- `selectionBackgroundColor`: Color to use for text background when part of a selection. Any legal CSS color value.

## How it works
The OCR or annotations boxes are rendered page-by-page and word-by-word into
**SVG images** that have the same dimensions as the page it annotates.
The **position** of these page SVGs is then **synchronized to the Mirador
viewport** with dynamic CSS transformations. The implementation of the
rendering itself is pretty straight-forward and can probably be adapted to
most "deep zoom" viewers without a lot of additional effort. If you need the
OCR parsing code as a separate package that you can base an implementation
for your favorite viewer on, please open an issue :-)

## Contributing
Found a bug? The plugin is not working with your manifest? Want a new
feature? Create an issue, or if you want to take a shot at fixing it
yourself, make a fork, create a pull request, we're always open to
contributions :-)

For larger changes/features, it's usually wise to open an issue before
starting the work, so we can discuss if it's a fit.

[npm-badge]: https://img.shields.io/npm/v/mirador-textoverlay.png?style=flat-square
[npm]: https://www.npmjs.org/package/mirador-textoverlay

[mirador-badge]: https://img.shields.io/badge/Mirador-%E2%89%A53.0.0--rc.5-blueviolet 
[mirador]: https://github.com/ProjectMirador/mirador/releases/tag/v3.0.0-rc.5

[screenshot]: .docassets/screenshot.jpg
[demo]: https://mirador-textoverlay.netlify.com
[demo-cfg]: https://github.com/dbmdz/mirador-textoverlay/blob/main/demo/src/index.js#L4-L24
[demo-cfg-catalog]: https://github.com/dbmdz/mirador-textoverlay/blob/main/demo/src/index.js#L5-L13
