// ===================================================
// 우리 반 담벼락 - Firebase Firestore & Auth 연동
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
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// --- Firebase 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyDT1GF4oO_yE9FRFPzB0uyOib4Ptrlx0rU",
  authDomain: "test-class-wall-mine-khst.firebaseapp.com",
  projectId: "test-class-wall-mine-khst",
  storageBucket: "test-class-wall-mine-khst.firebasestorage.app",
  messagingSenderId: "14859510948",
  appId: "1:14859510948:web:14f19388978b7e2ec43231"
};

// Firebase 및 Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const memosCollection = collection(db, "memos");

let currentUser = null; // 현재 로그인한 사용자 정보

// --- 로그인 상태 감시 ---
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderUserArea();
});

// 구글 로그인
async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("구글 로그인 오류:", error);
    alert("구글 로그인에 실패했습니다.");
  }
}

// 로그아웃
async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 오류:", error);
  }
}

// 로그인 영역 그리기
function renderUserArea() {
  const userArea = document.getElementById("userArea");
  if (!userArea) return;

  userArea.innerHTML = "";

  if (currentUser) {
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${currentUser.displayName || currentUser.email} 님 환영합니다! `;
    nameSpan.style.marginRight = "10px";

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.onclick = logout;

    userArea.appendChild(nameSpan);
    userArea.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google로 로그인";
    loginBtn.onclick = loginWithGoogle;

    userArea.appendChild(loginBtn);
  }
}

// --- 메모 목록 (Firestore 실시간 수신) ---
let memos = [];

const q = query(memosCollection, orderBy("createdAt", "asc"));
onSnapshot(q, function (snapshot) {
  memos = snapshot.docs.map(function (docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      text: data.text,
      uid: data.uid || null,
      authorName: data.authorName || "",
      createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
    };
  });
  render();
});


// ===================================================
// 데이터를 다루는 함수 세 개 (Firestore & Auth 연동)
// ===================================================

// 메모를 읽어 옵니다.
function loadMemos() {
  return memos;
}

// 메모를 새로 씁니다. (5글자 이상일 때만 저장)
async function addMemo(text) {
  const trimmed = text ? text.trim() : "";
  if (trimmed.length < 5) {
    alert("메모는 5글자 이상 입력해 주세요.");
    return false;
  }

  try {
    await addDoc(memosCollection, {
      text: trimmed,
      createdAt: serverTimestamp(),
      uid: currentUser ? currentUser.uid : null,
      authorName: currentUser ? (currentUser.displayName || "익명") : "익명"
    });
    return true;
  } catch (error) {
    console.error("메모 작성 오류:", error);
    return false;
  }
}

// 메모를 지웁니다.
async function deleteMemo(id, memoUid) {
  if (memoUid && currentUser && memoUid !== currentUser.uid) {
    alert("내가 쓴 메모만 지울 수 있습니다.");
    return;
  }

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
    deleteMemo(memo.id, memo.uid);
  };
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  if (memo.authorName) {
    const author = document.createElement("div");
    author.style.fontSize = "12px";
    author.style.color = "#777";
    author.style.marginTop = "8px";
    author.textContent = `- ${memo.authorName}`;
    div.appendChild(author);
  }

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

input.onkeydown = async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    const success = await addMemo(text);
    if (success) {
      input.value = "";
    }
  }
};


// 첫 화면 및 사용자 영역 그리기
renderUserArea();
render();
input.focus();
