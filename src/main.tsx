import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import TWEEN from "@tweenjs/tween.js";

// import { VertexNormalsHelper } from "three/addons/helpers/VertexNormalsHelper.js";

type PositionMouse = {
  x: number;
  y: number;
  z: number;
};
let scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls,
  model: THREE.Group<THREE.Object3DEventMap>;

let helper: THREE.LineSegments;

const positionMouse = [] as PositionMouse[]; // Array holding the 3d positions of annotations
// const annotation = document.querySelector(".annotation");

let raycaster: THREE.Raycaster,
  intersection: THREE.Intersection | null,
  sphere: THREE.Mesh;
const pointer = new THREE.Vector2();
const threshold = 0.01;

let hitpos: { x: number; y: number; z: number };
let hitnormal: { x: number; y: number; z: number };
let annotationCounter = 0;

init();
animate();

function init() {
  //-------------- Code for 3D rendering --------------//
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color();

  new THREE.TextureLoader().load("src/assets/bg_grid.png", function (texture) {
    scene.background = texture; // scene background(grid)
  });

  new RGBELoader().load("src/assets/winter_lake_01_1k.hdr", function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture; // use hdr as scene light source
  });

  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.y = 2;
  camera.position.z = 5;
  camera.lookAt(scene.position);
  camera.updateMatrix();

  // Lights
  const amblight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(amblight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(1, 0, 1).normalize();
  scene.add(dirLight);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.autoClear = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.2;
  controls.enableZoom = true;
  controls.maxDistance = 6; // for Perspective camera, may need to adjust val after testing on diff models
  controls.minDistance = 2.5;

  // Raycaster
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = threshold;
  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
    })
  );
  scene.add(sphere);

  //-------------- Geometries --------------//
  // Load 3d model
  new GLTFLoader().load(
    "src/assets/13_Can.gltf",
    function (gltf) {
      model = gltf.scene;
      scene.add(model);
      // console.log("model:", model);
      // helper = new VertexNormalsHelper(model.children[0], 200, 0xff0000);
      // scene.add(helper);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("dblclick", addAnnotation);
  document.addEventListener("keydown", lookatScene);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
}

function lookatAnnotation(annon: HTMLDivElement) {
  // Example from model viewer (https://modelviewer.dev/examples/annotations/index.html#cameraViews)
  // const annotationClicked = (annotation) => {
  //   let dataset = annotation.dataset;
  //   modelViewer2.cameraTarget = dataset.target;
  //   modelViewer2.cameraOrbit = dataset.orbit;
  //   modelViewer2.fieldOfView = "45deg";
  // };

  const pos = annon.dataset.position?.split(" ");
  if (pos) {
    new TWEEN.Tween(controls.target)
      .to(
        {
          x: Number(pos[0]),
          y: Number(pos[1]),
          z: Number(pos[2]),
        },
        500
      )
      .easing(TWEEN.Easing.Cubic.Out)
      .start();
  }

  const nm = annon.dataset.normal?.split(" ");

  // let z = { z1: Number(nm[0]), z2: Number(nm[1]), z3: Number(nm[2]) };
  // // let vecarr = [] as PositionMouse[];
  // let x = { x1: Number(nm[2]), x2: 0, x3: Number(nm[0]) * -1 };
  // let y = {
  //   y1: z.z2 * x.x3 - z.z3 * x.x2,
  //   y2: z.z3 * x.x1 - z.z1 * x.x3,
  //   y3: z.z1 * x.x2 - z.z2 * x.x1,
  // };

  // console.log("before:", camera);

  // const c1 = camera.position.x;
  // const c2 = camera.position.y;
  // const c3 = camera.position.z;

  // const m = new THREE.Matrix4();
  // m.set(
  //   x.x1,
  //   x.x2,
  //   x.x3,
  //   x.x1 * c1 + x.x2 * c2 + x.x3 * c3,
  //   y.y1,
  //   y.y2,
  //   y.y3,
  //   y.y1 * c1 + y.y2 * c2 + y.y3 * c3,
  //   z.z1,
  //   z.z2,
  //   z.z3,
  //   z.z1 * c1 + z.z2 * c2 + z.z3 * c3,
  //   0,
  //   0,
  //   0,
  //   1
  // );
  // console.log("m:", m);
  camera.matrixAutoUpdate = false;
  // camera.matrix.set(
  //   x.x1,
  //   x.x2,
  //   x.x3,
  //   -(x.x1 * c1 + x.x2 * c2 + x.x3 * c3) + Number(pos[0]),
  //   y.y1,
  //   y.y2,
  //   y.y3,
  //   -(y.y1 * c1 + y.y2 * c2 + y.y3 * c3) + Number(pos[1]),
  //   z.z1,
  //   z.z2,
  //   z.z3,
  //   -(z.z1 * c1 + z.z2 * c2 + z.z3 * c3) + Number(pos[2]),
  //   0,
  //   0,
  //   0,
  //   1
  // );

  // camera.matrix = camera.matrix.transpose();
  // const v = new THREE.Vector3(Number(pos[0]), Number(pos[1]), Number(pos[2]));
  // camera.lookAt(v);

  // camera.rotation.set(90, 0, 0);

  // console.log("after:", camera);

  // --------------

  // let m1 = new THREE.Matrix4();
  // let m2 = new THREE.Matrix4();
  // m1.set(
  //   1,
  //   0,
  //   0,
  //   -Number(pos[0]),
  //   0,
  //   1,
  //   0,
  //   -Number(pos[1]),
  //   0,
  //   0,
  //   1,
  //   -Number(pos[2]),
  //   0,
  //   0,
  //   0,
  //   1
  // );
  // m2.set(
  //   1,
  //   0,
  //   0,
  //   Number(pos[0]),
  //   0,
  //   1,
  //   0,
  //   Number(pos[1]),
  //   0,
  //   0,
  //   1,
  //   Number(pos[2]),
  //   0,
  //   0,
  //   0,
  //   1
  // );
  // let rm = new THREE.Matrix4();
  // rm.set(
  //   x.x1,
  //   x.x2,
  //   x.x3,
  //   -(x.x1 * c1 + x.x2 * c2 + x.x3 * c3) + Number(pos[0]),
  //   y.y1,
  //   y.y2,
  //   y.y3,
  //   -(y.y1 * c1 + y.y2 * c2 + y.y3 * c3) + Number(pos[1]),
  //   z.z1,
  //   z.z2,
  //   z.z3,
  //   -(z.z1 * c1 + z.z2 * c2 + z.z3 * c3) + Number(pos[2]),
  //   0,
  //   0,
  //   0,
  //   1
  // );
  // rm.multiplyMatrices(rm, m1);
  // rm.multiplyMatrices(m2, rm);
  // console.log(rm);
  // camera.matrix.set(
  //   rm.elements[0],
  //   rm.elements[1],
  //   rm.elements[2],
  //   rm.elements[3],
  //   rm.elements[4],
  //   rm.elements[5],
  //   rm.elements[6],
  //   rm.elements[7],
  //   rm.elements[8],
  //   rm.elements[9],
  //   rm.elements[10],
  //   rm.elements[11],
  //   rm.elements[12],
  //   rm.elements[13],
  //   rm.elements[14],
  //   rm.elements[15]
  // );

  camera.matrix.makeRotationX(3.14);
  camera.matrixWorldNeedsUpdate = true;
  scene.updateMatrix();
  // controls.target.set(Number(pos[0]), Number(pos[1]), Number(pos[2]));
  // camera.lookAt(new THREE.Vector3(pos[0], pos[1], pos[2]));
}

function lookatScene() {
  // new TWEEN.Tween(controls.target)
  //   .to(
  //     {
  //       x: 0,
  //       y: 0,
  //       z: 0,
  //     },
  //     500
  //   )
  //   .easing(TWEEN.Easing.Cubic.Out)
  //   .start();

  // console.log("quata:", camera.quaternion);
  // console.log("euler:", camera.rotation);
  console.log(camera);
}

function addAnnotation() {
  if (intersection !== null) {
    const annon = document.createElement("div");
    annon.slot = `annotation-${++annotationCounter}`;
    annon.classList.add("annotation");
    annon.id = `annotation-${annotationCounter}`;
    annon.appendChild(document.createTextNode("Hello Im new annotation"));
    annon.addEventListener("click", () => lookatAnnotation(annon));

    annon.dataset.position =
      hitpos.x.toString() +
      " " +
      hitpos.y.toString() +
      " " +
      hitpos.z.toString();

    positionMouse.push({ ...hitpos });

    annon.dataset.normal =
      hitnormal.x.toString() +
      " " +
      hitnormal.y.toString() +
      " " +
      hitnormal.z.toString();

    // console.log(hitpos);
    // console.log(positionMouse);
    // if (normal != null) {
    //   annon.dataset.normal = normal.toString();
    // }
    document.body.appendChild(annon);
    // console.log("mouse = ", x, ", ", y, positionAndNormal);

    // const element = document.createElement("p");
    // element.appendChild(document.createTextNode("Hello Im new annotation"));
    // element.classList.add("annotation");
    // document
    //   .getElementById(`annotation-${annotationCounter}`)
    //   .appendChild(element);

    const number = document.createElement("div");
    number.appendChild(document.createTextNode(annotationCounter.toString()));
    number.classList.add("number");
    document
      .getElementById(`annotation-${annotationCounter}`)
      .appendChild(number);
  }
}

function animate() {
  requestAnimationFrame(animate);
  // controls.update();

  // if (helper) helper.update();
  // console.log(camera);
  render();
}

function render() {
  renderer.render(scene, camera);
  TWEEN.update();
  // Annotation opacity and position
  updateAnnotationPosOpacity();

  // Raycast intersection (object mouse hit)
  raycaster.setFromCamera(pointer, camera);
  if (model) {
    const intersections = raycaster.intersectObject(model);
    intersection = intersections.length > 0 ? intersections[0] : null;
    if (intersection !== null) {
      sphere.position.copy(intersection.point);
      hitpos = intersection.point;
      hitnormal = intersection.normal;
    }
  }
}

function updateAnnotationPosOpacity() {
  // Adjust the position of annotation(3D) into 2D place
  positionMouse.map((element: PositionMouse, index: number) => {
    const vector = new THREE.Vector3(element.x, element.y, element.z); // Position of Annotation
    const annon = document.querySelector(`#annotation-${index + 1}`);

    vector.project(camera);

    // boolean to decide the opacity of annon
    const isBehind =
      camera.position.distanceTo(vector) >
      camera.position.distanceTo(model?.position);

    const rect = renderer.domElement.getBoundingClientRect();
    vector.x =
      Math.round(((vector.x + 1) * (rect.right - rect.left)) / 2) + rect.left;
    vector.y = Math.round(
      ((1 - vector.y) * (rect.bottom - rect.top)) / 2 + rect.top
    );

    if (annon) {
      annon.style.top = `${vector.y}px`;
      annon.style.left = `${vector.x}px`;
      annon.style.opacity = isBehind ? 0.25 : 1;
    }
  });
  // });
}

//-------------- Code for Database connection --------------//
import {
  storageListBuckets,
  storageListBucketFiles,
} from "./database/storageFunctions.tsx";
import { element, func } from "three/examples/jsm/nodes/Nodes.js";

// Bucket name
const bucketName = "testBucket";

storageListBuckets();

storageListBucketFiles(bucketName);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
