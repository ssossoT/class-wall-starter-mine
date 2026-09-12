// ===================================================
// 우리 반 담벼락 - Firebase Firestore 연동
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Firebase 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyDT1GF4oO_yE9FRFPzB0uyOib4Ptrlx0rU",
  authDomain: "test-class-wall-mine-khst.firebaseapp.com",
  projectId: "test-class-wall-mine-khst",
  storageBucket: "test-class-wall-mine-khst.firebasestorage.app",
  messagingSenderId: "14859510948",
  appId: "1:14859510948:web:14f19388978b7e2ec43231"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const memosCollection = collection(db, "memos");

// --- 메모 목록 (Firestore 실시간 수신) ---
let memos = [];

// Firestore의 "memos" 컬렉션을 올린 시각 순서로 실시간 감시합니다.
const q = query(memosCollection, orderBy("createdAt", "asc"));
onSnapshot(q, function (snapshot) {
  memos = snapshot.docs.map(function (docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      text: data.text,
      createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
    };
  });
  render();
});


// ===================================================
// 데이터를 다루는 함수 세 개 (Firestore 사용)
// ===================================================

// 메모를 읽어 옵니다.
function loadMemos() {
  return memos;
}

// 메모를 새로 씁니다.
async function addMemo(text) {
  try {
    await addDoc(memosCollection, {
      text: text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("메모 작성 오류:", error);
  }
}

// 메모를 지웁니다.
async function deleteMemo(id) {
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (error) {
    console.error("메모 삭제 오류:", error);
  }
}


// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  loadMemos().forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.onclick = function () {
    deleteMemo(memo.id);
    render();
  };
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.onkeydown = function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    addMemo(text);
    input.value = "";
    render();
  }
};


// 첫 화면 그리기
render();
input.focus();
