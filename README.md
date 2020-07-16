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

[demo-cfg-catalog]: https://github.com/dbmdz/mirador-textoverlay/blob/master/demo/src/index.js#L5-L13

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
`window` configuration:

```javascript
const miradorConfig = {
  // ...
  window: {
    // ....
    textOverlay: {
      enabled: true,  // disable or enable the plugin
      selectable: true,  // allow selecting the text, also works if text is not visible,
      visible: true, // enable visible rendering of the text
      opacity: 0.5, // default opacity for the rendered text
    }
  }
}
```
For individual configuration, put the same object as above into the window's
configuration object.

## How it works

The OCR or annotations boxes are rendered page-by-page word-by-word into an
**SVG image** that has the same dimensions as the Mirador viewport container.
The **position** of the pages in the SVG is then **synchronized to the
viewport** with dynamic CSS transformations. The implementation of the
rendering itself is pretty straight-forward and can probably be adapted to
most "deep zoom" viewers without a lot of additional effort.
If you need the OCR parsing code as a separate package that you can base an
implementation for your favorite viewer on, please open an issue :-)

## Contributing
Found a bug? The plugin is not working with your manifest? Want a new
feature? Create an issue, or if you want to take at fixing it yourself, make
a fork, create a pull request, we're always open to contributions :-)

For larger changes/features, it's usually wise to open an issue before
starting the work, so we can discuss if it's a fit.

[npm-badge]: https://img.shields.io/npm/v/mirador-textoverlay.png?style=flat-square
[npm]: https://www.npmjs.org/package/mirador-textoverlay

[mirador-badge]: https://img.shields.io/badge/Mirador-%E2%89%A53.0.0--rc.4-blueviolet 
[mirador]: https://github.com/ProjectMirador/mirador/releases/tag/v3.0.0-rc.4

[screenshot]: .docassets/screenshot.png
[demo]: https://mirador-textoverlay.netlify.com