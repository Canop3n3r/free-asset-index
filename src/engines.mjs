// Engine-ready manifests: where to put each asset and how to import it. Links only: download is manual from the source page.
import { slugify } from './lib.mjs';
export const ENGINES = ['godot', 'unity', 'threejs'];
const PREF = { godot: ['GLB', 'GLTF', 'OBJ', 'FBX', 'BLEND', 'PNG', 'JPG', 'HDR', 'EXR'], unity: ['FBX', 'OBJ', 'GLB', 'GLTF', 'BLEND', 'PNG', 'JPG', 'HDR', 'EXR'], threejs: ['GLB', 'GLTF', 'OBJ', 'FBX', 'PNG', 'JPG', 'HDR', 'EXR'] };
const ROOT = { godot: 'res://assets/free/', unity: 'Assets/FreeAssets/', threejs: 'public/assets/free/' };
const LOADER = { GLB: 'GLTFLoader', GLTF: 'GLTFLoader', OBJ: 'OBJLoader', FBX: 'FBXLoader', PNG: 'TextureLoader', JPG: 'TextureLoader', HDR: 'RGBELoader', EXR: 'EXRLoader' };
const HINT = {
  godot: f => (['GLB', 'GLTF'].includes(f) ? 'Drop the .glb/.gltf into the folder; Godot imports it as a scene.' : ['PNG', 'JPG'].includes(f) ? 'Use as a texture / StandardMaterial3D map.' : ['HDR', 'EXR'].includes(f) ? 'Use as a PanoramaSkyMaterial in a WorldEnvironment.' : `Import the .${f.toLowerCase()} (FBX via FBX2glTF/ufbx in Godot 4.3+).`),
  unity: f => (['FBX', 'OBJ'].includes(f) ? 'Drop into the folder; Unity imports it as a model prefab.' : ['GLB', 'GLTF'].includes(f) ? 'Install com.unity.cloud.gltfast, then drop in the .glb.' : ['PNG', 'JPG'].includes(f) ? 'Texture; set the Normal map type for *_Normal files.' : ['HDR', 'EXR'].includes(f) ? 'Set Texture Shape to Cube and use it in a Skybox/Cubemap material.' : 'Open in Blender and export FBX.'),
  threejs: f => (LOADER[f] ? `new ${LOADER[f]}().load(path)` : 'Convert to GLB with Blender first.'),
};
export function engineManifest(bundle, engine) {
  if (!ENGINES.includes(engine)) throw new Error(`unknown engine ${engine}`);
  return {
    engine, bundle: bundle.slug, title: bundle.title,
    note: 'Links only. Download each asset from sourceUrl, unzip it into targetPath and keep the attribution block in your credits.',
    attribution: bundle.attribution,
    assets: bundle.items.map(i => {
      const f = PREF[engine].find(x => (i.formats || []).includes(x)) || (i.formats || [])[0] || null;
      const a = { id: i.id, name: i.title, sourceUrl: i.url, download: 'manual', license: i.license, licenseUrl: i.licenseUrl, creator: i.creator, attribution: i.attribution,
        formats: i.formats, preferredFormat: f, targetPath: `${ROOT[engine]}${slugify(i.source)}/${slugify(i.title)}/`, importHint: f ? HINT[engine](f) : 'See source page.' };
      if (engine === 'threejs') a.loader = LOADER[f] || null;
      return a;
    }),
  };
}
