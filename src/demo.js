import Mirador from 'mirador';

import Plugin from './index';

const config = {
  catalog: [
    {
      manifestId:
        'https://api.digitale-sammlungen.de/iiif/presentation/v3/bsb10614001_00159_u001/manifest',
      provider: 'Bavarian State Library (hOCR, IIIFv3)',
    },
    {
      manifestId:
        'https://iiif.europeana.eu/presentation/9200396/BibliographicResource_3000118436165/manifest',
      provider: 'Europeana (Annotations, IIIFv2)',
    },
    {
      manifestId: 'https://iiif.europeana.eu/presentation/9200396/BibliographicResource_3000118435525/manifest?format=3',
      provider: 'Europeana (Annotations, IIIFv3)',
    },
    {
      manifestId: 'https://iiif.wellcomecollection.org/presentation/v2/b19956435',
      provider: 'Wellcome Library (ALTO, IIIFv2)',
    },
    {
      manifestId: 'https://iiif.wellcomecollection.org/presentation/v3/b18035723',
      provider: 'Wellcome Library (ALTO, IIIFv3)',
    },
    {
      manifestId: 'https://api.digitale-sammlungen.de/iiif/presentation/v2/bsb00135902/manifest',
      provider: 'Bavarian State Library (hOCR, IIIFv2)',
    },
    {
      manifestId: 'https://api.digitale-sammlungen.de/iiif/presentation/v3/bsb11342623/manifest',
      provider: 'Bavarian State Library (hOCR, IIIFv3)',
    },
  ],
  id: 'demo',
  window: {
    allowFullscreen: true,
    textOverlay: {
      enabled: true,
      selectable: true,
      visible: false,
    },
  },
  windows: [
    {
      canvasIndex: 8,
      manifestId: 'https://iiif.wellcomecollection.org/presentation/v3/b18035723',
      view: 'single',
    },
  ],
};

Mirador.viewer(config, [...Plugin]);
