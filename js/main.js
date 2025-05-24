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