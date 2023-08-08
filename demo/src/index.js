import Mirador from 'mirador/dist/es/src/index';
import textOverlayPlugin from '../../src';

const config = {
  catalog: [
    { manifestId: 'https://iiif.europeana.eu/presentation/9200396/BibliographicResource_3000118436165/manifest', provider: 'Europeana (Annotations)' },
    { manifestId: 'https://iiif.io/api/cookbook/recipe/0068-newspaper/newspaper_issue_1-manifest.json', provider: 'Cookbook (ALTO)' },
    { manifestId: 'https://wellcomelibrary.org/iiif/b19956435/manifest', provider: 'Wellcome Library (ALTO)' },
    { manifestId: 'https://wellcomelibrary.org/iiif/b18035723/manifest', provider: 'Wellcome Library (ALTO)' },
    { manifestId: 'https://scta.info/iiif/graciliscommentary/lon/manifest', provider: 'SCTA (Annotations)' },
    { manifestId: 'https://purl.stanford.edu/fg165hz3589/iiif/manifest', provider: 'Stanford University Libraries (ALTO)' },
  ],
  id: 'demo',
  window: {
    textOverlay: {
      enabled: true,
      selectable: true,
      visible: false,
    },
  },
  windows: [{
    canvasIndex: 8,
    manifestId: 'https://wellcomelibrary.org/iiif/b18035723/manifest',
  }],
};

// Allow to pass a manifest via query parameter, needed for IIIF Cookbook compatiblity
const urlParams = new URLSearchParams(window.location.search);
const iiifContent = urlParams.get('iiif-content');
if (iiifContent) {
  config.catalog.push({ manifestId: iiifContent, provider: 'IIIF Content' });
  config.windows[0].manifestId = iiifContent;
  config.windows[0].canvasIndex = 0;
}

Mirador.viewer(config, [
  ...textOverlayPlugin,
]);
