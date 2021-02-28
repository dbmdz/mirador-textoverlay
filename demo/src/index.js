import Mirador from 'mirador/dist/es/src/index';
import textOverlayPlugin from '../../src';

const config = {
  catalog: [
    {
      manifestId: 'https://dbmdz.github.io/mirador-textoverlay/manifests/EAP119-1-8-1_issue1.json',
      provider: 'British National Library (ALTO, Arabic)',
    },
    {
      manifestId: 'https://dbmdz.github.io/mirador-textoverlay/manifests/bsb00084914.json',
      provider: 'Bavarian State Library (ALTO, Hebrew)',
    },
    {
      manifestId:
        'https://iiif.europeana.eu/presentation/9200396/BibliographicResource_3000118436165/manifest',
      provider: 'Europeana (Annotations)',
    },
    {
      manifestId: 'https://wellcomelibrary.org/iiif/b19956435/manifest',
      provider: 'Wellcome Library (ALTO)',
    },
    {
      manifestId: 'https://wellcomelibrary.org/iiif/b18035723/manifest',
      provider: 'Wellcome Library (ALTO)',
    },
    {
      manifestId: 'https://scta.info/iiif/graciliscommentary/lon/manifest',
      provider: 'SCTA (Annotations)',
    },
    {
      manifestId: 'https://purl.stanford.edu/fg165hz3589/iiif/manifest',
      provider: 'Stanford University Libraries (ALTO)',
    },
  ],
  id: 'demo',
  window: {
    textOverlay: {
      enabled: true,
      selectable: true,
      visible: true,
    },
  },
  windows: [
    /*
    {
      canvasIndex: 0,
      manifestId: 'https://dbmdz.github.io/mirador-textoverlay/manifests/EAP119-1-8-1_issue1.json',
    },
    */
    {
      canvasIndex: 0,
      manifestId: 'https://dbmdz.github.io/mirador-textoverlay/manifests/bsb00084914.json',
    },
  ],
};

Mirador.viewer(config, [...textOverlayPlugin]);
