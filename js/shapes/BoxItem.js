import * as THREE from 'https://esm.sh/three@0.155.0';

export class BoxItem {
  constructor(width, height, depth, color = 0xdeb887) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x333333 })
    );

    // ✅ 枠線を mesh に追加（親：mesh、子：edgeLines）
    mesh.add(edgeLines);

    // ✅ edgeLines は Raycaster 対象外にする（クリックできないようにする）
    edgeLines.raycast = () => { }; // ← ★これが決め手！

    // ✅ mesh を group に入れる（Transformなどの管理しやすく）
    this.group = new THREE.Group();
    this.group.add(mesh);

    // 👇 必要に応じて保持
    this.mesh = mesh;
    this.edgeLines = edgeLines;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  addToScene(scene) {
    scene.add(this.group);
  }
}