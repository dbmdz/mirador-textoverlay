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

Mirador.viewer(config, [
  ...textOverlayPlugin,
]);
