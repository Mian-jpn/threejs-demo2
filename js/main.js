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

const contextMenu = document.getElementById("context-menu");

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();

  // Raycast: マウス下の Box を取得
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(draggableObjects, true);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    selectedBox = mesh;

    // メニューを表示
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.style.display = "block";
  } else {
    contextMenu.style.display = "none"; // 対象がないなら非表示
  }
});

//右クリックで削除を選択したとき
document.getElementById("menu-delete").addEventListener("click", () => {
  if (selectedBox) {
    scene.remove(selectedBox.parent);
    contextMenu.style.display = "none";
    selectedBox = null;
    document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
  }
});

//右クリックで複製を選択したとき
document.getElementById("menu-duplicate").addEventListener("click", () => {
  if (!selectedBox) return;

  // 1. 元のサイズを取得（geometry.parametersはThree.jsの元データ）
  const originalGeo = selectedBox.geometry.parameters;
  const scale = selectedBox.scale;

  const width = originalGeo.width * scale.x * 100;
  const height = originalGeo.height * scale.y * 100;
  const depth = originalGeo.depth * scale.z * 100;

  // 2. 元の色を取得（originalColorが保存されていればそれを使う）
  const color = selectedBox.originalColor || selectedBox.material.color.getHex();

  // 3. 新しいBoxを作成
  const newBox = new BoxItem(width, height, depth, color);

  // 4. 元のBoxの位置に少しずらして配置
  const oldPos = selectedBox.position;
  newBox.setPosition(oldPos.x + 0.2, oldPos.y, oldPos.z);

  // 5. シーンに追加
  newBox.addToScene(scene);
  draggableObjects.push(newBox.mesh);
  setupDragControls();

  // 6. メニューを閉じる
  contextMenu.style.display = "none";
});

//左クリックで木材を選択したときに、長さを出すようにしている。
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBox = null;

window.addEventListener("click", (event) => {
  // ✅ HTMLのUIをクリックしているときはThree.jsの選択処理をスキップ
  const tag = event.target.tagName.toLowerCase();
  if (tag === "button" || tag === "li" || tag === "div" && event.target.id === "toolbar") return;

  // 👇ここからThree.js上のオブジェクト選択処理
  setMousePositionFromEvent(event);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(draggableObjects, true);
  if (intersects.length > 0) {
    const mesh = intersects[0].object;

    if (selectedBox === mesh) {
      selectedBox.material.color.set(selectedBox.originalColor);
      selectedBox = null;
      document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
      return;
    }

    if (selectedBox) {
      selectedBox.material.color.set(selectedBox.originalColor);
    }

    selectedBox = mesh;

    if (!selectedBox.originalColor) {
      selectedBox.originalColor = selectedBox.material.color.getHex();
    }

    const color = selectedBox.material.color;
    color.setRGB(color.r * 0.8, color.g * 0.8, color.b * 0.8);

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

  // 📦 Box を即座に追加
  createBox(selectedBoxSpec.width, selectedBoxSpec.height, selectedBoxSpec.depth);
}

function createBox(w, h, d) {
  const box = new BoxItem(w, h, d);
  box.setPosition(position_num, 0, 0);
  position_num += 0.2;
  box.addToScene(scene);
  draggableObjects.push(box.mesh);
  setupDragControls();
}

function setMousePositionFromEvent(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// ✅ ボタンにイベントを登録（main.js の末尾または window.onload 直後に追加）
document.getElementById("btn-2x4").addEventListener("click", () => {
  selectBoxType("2x4");
});

document.getElementById("btn-1x6").addEventListener("click", () => {
  selectBoxType("1x6");
});