import * as THREE from 'https://esm.sh/three@0.155.0';
import { OrbitControls } from 'https://esm.sh/three@0.155.0/examples/jsm/controls/OrbitControls.js';
import { BoxItem } from './shapes/BoxItem.js';

// シーン・カメラ・レンダラー
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
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

// 📦 複数の BoxItem を作成
const box1 = new BoxItem(1, 1, 1);
box1.setPosition(0, 0, 0);
box1.addToScene(scene);

const box2 = new BoxItem(0.5, 1.5, 0.5, 0xff8844);
box2.setPosition(2, 0, 0);
box2.addToScene(scene);

const box3 = new BoxItem(2, 3, 0.5, 0xff9000);
box3.setPosition(4, 0, 0);
box3.addToScene(scene);

// アニメーション
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  
}
animate();