declare module 'shpjs' {
  import type { FeatureCollection } from 'geojson';

  function shp(input: string | ArrayBuffer): Promise<FeatureCollection | FeatureCollection[]>;
  export default shp;
}
