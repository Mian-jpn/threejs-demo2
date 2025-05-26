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

    // 7) ビジュアル更新
    updateSelectionVisuals();

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

  // 左クリックだけに制限
  dragControls.mouseButtons = {
    LEFT: THREE.MOUSE.LEFT,
    MIDDLE: null,
    RIGHT: null
  };

  let currentBoxItem = null;
  let touchedBox = null;
  let collisionHandled = false;

  // ドラッグ開始時
  dragControls.addEventListener('dragstart', e => {
    orbit.enabled = false;
    currentBoxItem = draggableObjects.find(b => b.mesh === e.object);
    // 衝突前の「有効な位置」を記憶
    currentBoxItem.previousPosition = currentBoxItem.mesh.position.clone();
    touchedBox = null;
    collisionHandled = false;
  });

  // ドラッグ中の衝突検知＆緑点灯
  dragControls.addEventListener('drag', e => {
    if (!currentBoxItem) return;
    const movingBox3 = new THREE.Box3().setFromObject(currentBoxItem.mesh);
    let isTouching = false;

    for (const other of draggableObjects) {
      if (other === currentBoxItem) continue;
      const otherBox3 = new THREE.Box3().setFromObject(other.mesh);
      if (movingBox3.intersectsBox(otherBox3)) {
        isTouching = true;
        touchedBox = other;
        break;
      }
    }

    if (isTouching) {
      // 初回衝突時のみ、いったん前回位置に戻す
      if (!collisionHandled) {
        currentBoxItem.mesh.position.copy(currentBoxItem.previousPosition);
        collisionHandled = true;
      }
      currentBoxItem.mesh.material.emissive.setHex(0x00ff00);
      touchedBox.mesh.material.emissive.setHex(0x00ff00);
    } else {
      // 衝突していなければ色リセット
      draggableObjects.forEach(b => b.mesh.material.emissive.setHex(0x000000));
    }
  });

  dragControls.addEventListener('dragend', e => {
    orbit.enabled = true;

    if (currentBoxItem) {
      // ① 今の位置で衝突している Box を探す
      const aBox = new THREE.Box3().setFromObject(currentBoxItem.mesh);
      let collisions = [];

      for (const other of draggableObjects) {
        if (other === currentBoxItem) continue;
        const bBox = new THREE.Box3().setFromObject(other.mesh);
        if (aBox.intersectsBox(bBox)) {
          collisions.push({ item: other, box: bBox });
        }
      }

      if (collisions.length > 0) {
        // ② 複数衝突していたら、その中で最も浅いオーバーラップ深さの軸をもつものを選ぶ
        //    （今回はひとつずつ処理してもOK）
        const { item: target } = collisions[0];
        const aCenter = aBox.getCenter(new THREE.Vector3());
        const bBox = new THREE.Box3().setFromObject(target.mesh);
        const bCenter = bBox.getCenter(new THREE.Vector3());
        const aSize = aBox.getSize(new THREE.Vector3());
        const bSize = bBox.getSize(new THREE.Vector3());

        const overlaps = {
          x: (aSize.x / 2 + bSize.x / 2) - Math.abs(aCenter.x - bCenter.x),
          y: (aSize.y / 2 + bSize.y / 2) - Math.abs(aCenter.y - bCenter.y),
          z: (aSize.z / 2 + bSize.z / 2) - Math.abs(aCenter.z - bCenter.z),
        };

        // 最小オーバーラップ軸を選ぶ
        let axis = 'x';
        let min = overlaps.x;
        if (overlaps.y < min) { min = overlaps.y; axis = 'y'; }
        if (overlaps.z < min) { min = overlaps.z; axis = 'z'; }

        // ③ その軸方向にだけスナップ
        const dir = (aCenter[axis] > bCenter[axis]) ? 1 : -1;
        const snapPos = bCenter[axis] + dir * (bSize[axis] / 2 + aSize[axis] / 2);
        // mesh.position を直接更新
        const delta = snapPos - aCenter[axis];
        currentBoxItem.mesh.position[axis] += delta;
      }
    }

    // 全ての色をリセット
    draggableObjects.forEach(b =>
      b.mesh.material.emissive.setHex(0x000000)
    );

    // 状態をクリア
    currentBoxItem = null;
    touchedBox = null;
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
//左端を揃える
document.getElementById("align-left").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem のグループごとの境界箱を計算し、最小 X を取得
  const mins = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.min.x;
  });
  const targetX = Math.min(...mins);

  // それぞれの BoxItem を targetX に揃える
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetX - bb.min.x;
    b.group.position.x += delta;
  });
});

// 上端を揃える（Y 軸の最大値をそろえる）
document.getElementById("align-top").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem の境界箱を計算し、最大 Y を取得
  const maxs = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.max.y;
  });
  const targetY = Math.max(...maxs);

  // それぞれの BoxItem の top (= bb.max.y) を targetY にそろえる
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetY - bb.max.y;
    b.group.position.y += delta;
  });
});

// ———— 下端揃え（Y 軸の最小値をそろえる） ————
document.getElementById("align-bottom").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem の境界箱を計算し、最小 Y を取得
  const minsY = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.min.y;
  });
  const targetY = Math.min(...minsY);

  // それぞれの BoxItem を targetY に揃える
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetY - bb.min.y;
    b.group.position.y += delta;
  });
});

// ———— 右端揃え（X 軸の最大値をそろえる） ————
document.getElementById("align-right").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem の境界箱を計算し、最大 X を取得
  const maxsX = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.max.x;
  });
  const targetX = Math.max(...maxsX);

  // それぞれの BoxItem を targetX に揃える
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetX - bb.max.x;
    b.group.position.x += delta;
  });
});
// ———— 手前揃え（Z軸の最大値をそろえる） ————
document.getElementById("align-front").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem の AABB を計算して、最大 z（手前側）を取得
  const maxsZ = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.max.z;
  });
  const targetZ = Math.max(...maxsZ);

  // それぞれの BoxItem を targetZ に揃える
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetZ - bb.max.z;
    b.group.position.z += delta;
  });
});
// ———— 奥揃え（Z軸の最小値をそろえる） ————
document.getElementById("align-back").addEventListener("click", () => {
  if (selectedBoxes.length < 2) return;

  // 各 BoxItem の AABB を計算して、最小 z（奥側）を取得
  const minsZ = selectedBoxes.map(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    return bb.min.z;
  });
  const targetZ = Math.min(...minsZ);

  // それぞれの BoxItem を targetZ に揃える
  selectedBoxes.forEach(b => {
    const bb = new THREE.Box3().setFromObject(b.group);
    const delta = targetZ - bb.min.z;
    b.group.position.z += delta;
  });
});

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
