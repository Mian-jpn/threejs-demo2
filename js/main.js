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
const draggableObjects = []; //BoxItem[]

const contextMenu = document.getElementById("context-menu");

//右クリックを押したとき（contextmenuがデフォルト）
//window.addEventListener("contextmenu", (event) => {
renderer.domElement.addEventListener('contextmenu', event => {
  console.log('🔥 contextmenu fired!', event);
  event.preventDefault();

  // Raycast: マウス下の Box を取得
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(
    draggableObjects.map(b => b.mesh),  // ← mesh 配列に変換
    true
  );

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

//削除を選択したとき
document.getElementById("menu-delete").addEventListener("click", () => {
  if (selectedBox) {
    scene.remove(selectedBox.parent);
    contextMenu.style.display = "none";
    selectedBox = null;
    document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
  }
});

//複製ボタンを押したとき
document.getElementById("menu-duplicate").addEventListener("click", () => {
  if (!selectedBox) return;

  // 1. サイズを取得（mesh を前提とします）
  const geo = selectedBox.geometry.parameters;
  const scale = selectedBox.scale;
  const width = geo.width * scale.x * 100;
  const height = geo.height * scale.y * 100;
  const depth = geo.depth * scale.z * 100;

  // 2. 色を取得
  const color = selectedBox.originalColor || selectedBox.material.color.getHex();

  // 3. BoxItem を生成
  const newBox = new BoxItem(width, height, depth, color);

  // 4. 位置を少しずらして配置
  const oldPos = selectedBox.position;
  newBox.setPosition(oldPos.x + 0.2, oldPos.y, oldPos.z);

  // 5. “向き” をコピー
  newBox.mesh.rotation.copy(selectedBox.rotation);
  // （もしスケールもコピーしたいなら）
  // newBox.mesh.scale.copy(selectedBox.scale);

  // 6. シーンに追加
  newBox.addToScene(scene);

  // 7. draggableObjects には “mesh” 配列で渡す or “BoxItem” 配列で map() するか
  //    → 今回は mesh の配列に合わせる例を示します
  draggableObjects.push(newBox);

  // 8. DragControls を再設定
  setupDragControls();

  // 9. メニューを閉じる
  contextMenu.style.display = "none";
});

//右クリックで回転を選択したとき
document.getElementById("menu-rotate").addEventListener("click", (e) => {
  if (!selectedBox) return;

  // 📌 サブメニューを「回転」メニューのすぐ下に表示
  const submenu = document.getElementById("rotate-submenu");
  submenu.style.left = `${e.clientX}px`;
  submenu.style.top = `${e.clientY + 30}px`; // 少し下にずらす
  submenu.style.display = "block";

  // 元のメニューは隠す
  contextMenu.style.display = "none";
});

//X軸方向に回転
document.getElementById("rotate-x").addEventListener("click", () => {
  if (selectedBox) {
    selectedBox.rotation.x += Math.PI / 2;
  }
  document.getElementById("rotate-submenu").style.display = "none";
});

//Y軸方向に回転
document.getElementById("rotate-y").addEventListener("click", () => {
  if (selectedBox) {
    selectedBox.rotation.y += Math.PI / 2;
  }
  document.getElementById("rotate-submenu").style.display = "none";
});

//toolバーを削除するときの動作。条件文を入れないとサブメニュー出てきてほしいところでメニューが消えてしまう。
window.addEventListener("click", (event) => {
  // ✅ toolbar・メニュー内をクリックしたときは閉じない
  const clickedInsideMenu =
    event.target.closest("#context-menu") ||
    event.target.closest("#rotate-submenu") ||
    event.target.closest('#align-toolbar') ||
    event.target.closest("#toolbar");

  if (!clickedInsideMenu) {
    document.getElementById("rotate-submenu").style.display = "none";
    contextMenu.style.display = "none";
  }
});

//右クリックで木材を選択したときに、長さを出すようにしている。
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedBox = null;
let selectedBoxes = [];

window.addEventListener("click", (event) => {

  // draggableObjects は BoxItem の配列 → mesh の配列に変換
  const meshes = draggableObjects.map(b => b.mesh);

  // (A) Shift＋クリック → マルチ選択
  if (event.shiftKey) {
    // 1) UI 部分でのクリックは無視
    if (
      event.target.closest("#toolbar") ||
      event.target.closest("#context-menu") ||
      event.target.closest("#rotate-submenu") ||
      event.target.closest("#align-toolbar")
    ) return;

    // 2) マウス座標を Three.js 用にセット & Raycaster 更新
    setMousePositionFromEvent(event);
    raycaster.setFromCamera(mouse, camera);

    // 3) BoxItem の mesh 配列で交差判定
    const meshes = draggableObjects.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(meshes, true);
    if (intersects.length === 0) return;

    // 4) ヒットした mesh を取り出し、
    const pickedMesh = intersects[0].object;

    // 5) そこから元の BoxItem を逆引き
    const box = draggableObjects.find(b => b.mesh === pickedMesh);
    if (!box) return;

    // 6) 選択配列にあれば外し、なければ追加
    const idx = selectedBoxes.indexOf(box);
    if (idx >= 0) selectedBoxes.splice(idx, 1);
    else selectedBoxes.push(box);

    // 7) ビジュアル更新＆整列ツールバー表示
    updateSelectionVisuals();
    showAlignToolbar();

    // 単一選択処理は走らせない
    return;
  }

  // (B) Shiftなし → 単一選択
  //  UI 上のクリックは無視
  if (
    event.target.closest("#toolbar") ||
    event.target.closest("#context-menu") ||
    event.target.closest("#rotate-submenu") ||
    event.target.closest("#align-toolbar")
  ) {
    return;
  }

  // 👇ここからThree.js上のオブジェクト選択処理
  // マウス位置セット & Raycaster 更新
  setMousePositionFromEvent(event);
  raycaster.setFromCamera(mouse, camera);

  // Raycast 実行（Mesh 配列を使う）
  const intersects = raycaster.intersectObjects(meshes, true);
  if (intersects.length === 0) {
    // (1) 単一選択を解除
    if (selectedBox) {
      selectedBox.mesh.material.color.set(selectedBox.originalColor);
      selectedBox = null;
      document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
    }
    return;
  }
  //(2) 複数選択リストをクリア
  selectedBoxes = [];

  // (3) ハイライトをすべて元に戻す
  updateSelectionVisuals();

  // (4) 整列ツールバーを隠す
  showAlignToolbar();


  // Boxを選択しているとき
  // 最前面の Mesh を取り出し
  const pickedMesh = intersects[0].object;

  // それを持つ BoxItem を探す
  const box = draggableObjects.find(b => b.mesh === pickedMesh);
  if (!box) return;

  // すでに同じ BoxItem を選んでいたら選択解除
  if (selectedBox === box) {
    selectedBox.mesh.material.color.set(selectedBox.originalColor);
    selectedBox = null;
    document.getElementById("info").innerText = "幅: -　高さ: -　奥行: -";
    return;
  }

  // 前の選択解除（あれば）
  if (selectedBox) {
    selectedBox.mesh.material.color.set(selectedBox.originalColor);
  }
  // 新しい選択を記録 & ハイライト
  selectedBox = box;
  if (!selectedBox.originalColor) {
    selectedBox.originalColor = selectedBox.mesh.material.color.getHex();
  }

  const c = selectedBox.mesh.material.color;
  c.setRGB(c.r * 0.8, c.g * 0.8, c.b * 0.8);

  // サイズ表示
  const p = selectedBox.mesh.geometry.parameters;
  const w = (p.width * selectedBox.mesh.scale.x * 100).toFixed(1);
  const h = (p.height * selectedBox.mesh.scale.y * 100).toFixed(1);
  const d = (p.depth * selectedBox.mesh.scale.z * 100).toFixed(1);
  document.getElementById("info").innerText = `幅: ${w}mm　高さ: ${h}mm　奥行: ${d}mm`;
});

let dragControls; // ← 外で宣言しておく

function setupDragControls() {
  if (dragControls) dragControls.dispose(); // 古いコントロールを破棄
  const dragTargets = draggableObjects.map(b => b.mesh);
  dragControls = new DragControls(dragTargets, camera, renderer.domElement);

  // ← ここで「左クリックだけ」に制限
  dragControls.mouseButtons = {
    LEFT: THREE.MOUSE.LEFT,
    MIDDLE: null,
    RIGHT: null
  };

  let currentBoxItem = null;

  // ドラッグ開始時に BoxItem を特定し、前回位置を記憶
  dragControls.addEventListener('dragstart', e => {
    orbit.enabled = false;
    // e.object は Mesh なので BoxItem を逆引き
    currentBoxItem = draggableObjects.find(b => b.mesh === e.object);
    // safety: 直前の有効ポジションを再度セット
    currentBoxItem.previousPosition = currentBoxItem.mesh.position.clone();
  });
  // ドラッグ中に毎フレーム衝突チェック
  dragControls.addEventListener('drag', e => {
    if (!currentBoxItem) return;
    // ① 動かしたあとの Box の AABB を計算
    const movingBox3 = new THREE.Box3().setFromObject(currentBoxItem.mesh);

    // ② 他の BoxItem すべてとぶつかるかチェック
    for (const other of draggableObjects) {
      if (other === currentBoxItem) continue;
      const otherBox3 = new THREE.Box3().setFromObject(other.mesh);
      if (movingBox3.intersectsBox(otherBox3)) {
        //衝突したら前回の有効位置に戻して終わり
        currentBoxItem.mesh.position.copy(currentBoxItem.previousPosition)
        return;
      }
    }
    //衝突しなかったらこの位置は有効と記憶しなおす。
    currentBoxItem.previousPosition.copy(currentBoxItem.mesh.position);
  });
  dragControls.addEventListener('dragend', (e) => {
    orbit.enabled = true;
    currentBoxItem = null;
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
  draggableObjects.push(box);
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

function showAlignToolbar() {
  const tb = document.getElementById("align-toolbar");
  tb.style.display = selectedBoxes.length > 1 ? "block" : "none";
}

//横揃え（Y座標を平均に揃える）
document.getElementById("align-h").addEventListener("click", () => {
  const avgY = selectedBoxes.reduce((sum, b) => sum + b.mesh.position.y, 0) / selectedBoxes.length;
  selectedBoxes.forEach(b => b.mesh.position.y = avgY);
})

//縦揃え（X座標を平均に揃える）
document.getElementById("align-v").addEventListener("click", () => {
  const avgX = selectedBoxes.reduce((sum, b) => sum + b.mesh.position.x, 0) / selectedBoxes.length;
  selectedBoxes.forEach(b => b.mesh.position.x = avgX);
})

//UIを閉じる
window.addEventListener("click", event => {
  if (!event.shiftKey) selectedBoxes = [];
  showAlignToolbar();
})

//Shiftクリックの時にBoxに黄色くする
function updateSelectionVisuals() {
  // 1) まず全 Box を元の色に戻す
  draggableObjects.forEach(box => {
    const mat = box.mesh.material;
    // originalColor がなければ記憶しておく
    if (box.originalColor == null) {
      box.originalColor = mat.color.getHex();
    }
    // 元色にリセット
    mat.color.setHex(box.originalColor);
  });

  // 2) 選択中の Box にだけ黄色味を追加
  selectedBoxes.forEach(box => {
    const mat = box.mesh.material;
    // THREE.Color の offsetHSL メソッドで HSL を少しずらす
    //   0.1 は色相を少し回す（黄寄りに）、
    //   第２引数の 0 は彩度はそのまま、
    //   第３引数の +0.1 で少し明るく
    mat.color.offsetHSL(0.1, 0.0, 0.1);
  });
}
