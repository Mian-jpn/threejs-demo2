import * as THREE from 'https://esm.sh/three@0.155.0';
import { DragControls } from 'https://esm.sh/three@0.155.0/examples/jsm/controls/DragControls.js';
import { OrbitControls } from 'https://esm.sh/three@0.155.0/examples/jsm/controls/OrbitControls.js';
import { BoxItem } from './shapes/BoxItem.js';

// シーン・カメラ・レンダラー
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 光
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

//環境光を追加する
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // 色, 強さ
scene.add(ambientLight);

// カメラ操作
const orbit = new OrbitControls(camera, renderer.domElement);

// // 📦 複数の BoxItem を作成
// const box1 = new BoxItem(1, 1, 1);
// box1.setPosition(0, 0, 0);
// box1.addToScene(scene);


// 材種ごとのサイズマップ
const boxTypeMap = {
  "2x4": { width: 38, height: 89, depth: 910 },
  "1x6": { width: 19, height: 140, depth: 910 },
};

let selectedType = "2x4"; // デフォルト

let selectedBoxSpec = boxTypeMap[selectedType]; // 現在選択中の材種

let position_num = 0;

// オブジェクト（Box）を複数格納しておく配列
const draggableObjects = [];

// 右クリックでBoxを追加
window.addEventListener('contextmenu', (event) => {
  event.preventDefault(); // ← 標準の右クリックメニューを無効化

  // 1. 位置を決める（例：カメラ正面）
  const box = new BoxItem(
    selectedBoxSpec.width,
    selectedBoxSpec.height,
    selectedBoxSpec.depth
  );
  box.setPosition(position_num, 0, 0); // ← 固定でもOK
  position_num++;
  // 2. シーンに追加
  box.addToScene(scene);
  draggableObjects.push(box.mesh); // ← group または mesh を追加
  // 3. オプション：TransformControlsを付けるなど

  //ここでDragControlに入れる。
  setupDragControls(); // ← ✅ これが必要！！
});

document.getElementById("btn-2x4").addEventListener("click", () => {
  selectBoxType("2x4");
});

document.getElementById("btn-1x6").addEventListener("click", () => {
  selectBoxType("1x6");
});

// ✅ 初期状態として2x4を選択しておく。　これは上のボタン定義の後に書く必要がある。
selectBoxType("2x4");

//木材を選択したときに、長さを出すようにしている。
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBox = null;

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(draggableObjects, true);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;

    // ✅ もし同じ Box をもう一度クリックしたら選択解除
    if (selectedBox === mesh) {
      // 色を元に戻す
      selectedBox.material.color.set(selectedBox.originalColor);
      selectedBox = null;

      // 表示もリセット
      document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
      return;
    }

    // ✅ 前回の選択をリセット（色を戻す）
    if (selectedBox) {
      selectedBox.material.color.set(selectedBox.originalColor);
    }

    // ✅ 今回の選択を記録
    selectedBox = mesh;

    // 元の色を保存（まだ保存してなければ）
    if (!selectedBox.originalColor) {
      selectedBox.originalColor = selectedBox.material.color.getHex();
    }

    // 色を暗くする
    const color = selectedBox.material.color;
    color.setRGB(color.r * 0.8, color.g * 0.8, color.b * 0.8);

    // サイズ表示
    const size = mesh.geometry.parameters;
    const width = (size.width * mesh.scale.x * 100).toFixed(1);
    const height = (size.height * mesh.scale.y * 100).toFixed(1);
    const depth = (size.depth * mesh.scale.z * 100).toFixed(1);

    document.getElementById("info").innerText =
      `幅: ${width}mm　高さ: ${height}mm　奥行: ${depth}mm`;
  }
});
let dragControls; // ← 外で宣言しておく
function setupDragControls() {
  if (dragControls) dragControls.dispose(); // 古いコントロールを破棄
  dragControls = new DragControls(draggableObjects, camera, renderer.domElement);

  dragControls.addEventListener('dragstart', () => {
    orbit.enabled = false;
  });
  dragControls.addEventListener('dragend', () => {
    orbit.enabled = true;
  });
}

// アニメーション
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

}
animate();

function selectBoxType(type) {
  selectedType = type;
  selectedBoxSpec = boxTypeMap[type];

  // 📋 ラベル更新
  document.getElementById("selected-label").innerText = `選択中: ${type}`;

  // 🔄 ボタンの選択状態を切り替え
  document.querySelectorAll("#toolbar button").forEach(btn => {
    btn.classList.toggle("selected", btn.id === `btn-${type}`);
  });
}