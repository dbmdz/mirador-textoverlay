import Mirador from 'mirador/dist/es/src/index';
import textOverlayPlugin from '../../src';

const config = {
  catalog: [
    { manifestId: 'https://iiif.europeana.eu/presentation/9200396/BibliographicResource_3000118436165/manifest', provider: 'Europeana' },
    { manifestId: 'https://wellcomelibrary.org/iiif/b19956435/manifest', provider: 'Wellcome Library' },
    { manifestId: 'https://damsssl.llgc.org.uk/iiif/2.0/4566425/manifest.json', provider: 'LLGC' },
    { manifestId: 'https://data.ucd.ie/api/img/manifests/ucdlib:33064', provider: 'Irish Architectural Archive' },
    { manifestId: 'https://wellcomelibrary.org/iiif/b18035723/manifest', provider: 'Wellcome Library' },
    { manifestId: 'https://scta.info/iiif/graciliscommentary/lon/manifest', provider: 'SCTA' },
    { manifestId: 'https://purl.stanford.edu/zx429wp8334/iiif/manifest', provider: 'SUL' },
  ],
  id: 'demo',
  windows: [{
    canvasIndex: 8,
    manifestId: 'https://wellcomelibrary.org/iiif/b18035723/manifest',
    textDisplay: {
      enabled: true,
      selectable: true,
      visible: true,
    },
  }],
};

Mirador.viewer(config, [
  ...textOverlayPlugin,
]);
