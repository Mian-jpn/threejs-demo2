import * as THREE from 'https://esm.sh/three@0.155.0';

export class BoxItem {
  
  constructor(width, height, depth, color = 0xdeb887) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material); // ✅ 必須！

    // 🧱 枠線（エッジ）
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x333333 })
    );

    // 📦 グループに追加
    this.group = new THREE.Group();
    this.group.add(mesh);
    this.group.add(edgeLines);

    // 🎯 メッシュをプロパティとして保持（例：TransformControls用）
    this.mesh = mesh;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  addToScene(scene) {
    scene.add(this.group);
  }
}