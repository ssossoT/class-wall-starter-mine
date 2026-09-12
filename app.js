// ===================================================
// 우리 반 담벼락 - Firebase Firestore & Auth (역할 구분)
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

// --- 교사 UID 목록 ---
// 교사 권한을 줄 Firebase Auth UID 목록입니다. 
// 여기에 교사의 UID 문자열을 추가하면 교사(teacher) 권한이 부여됩니다.
const TEACHER_UIDS = [
  // 예시: "aBcDeFgHiJkLmNoPqRsTuVwXyZ12"
];

// Firebase 및 Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const memosCollection = collection(db, "memos");

let currentUser = null; // 현재 로그인한 사용자 정보

// --- 사용자 역할 (Role) 판별 ---
// teacher: 교사 (모든 메모 생성 및 삭제 권한)
// student: 학생 (자신의 메모 생성 및 자신의 메모 삭제 권한)
// guest: 비로그인
function getUserRole() {
  if (!currentUser) return "guest";
  if (TEACHER_UIDS.includes(currentUser.uid)) {
    return "teacher";
  }
  return "student";
}

// --- 로그인 상태 감시 ---
onAuthStateChanged(auth, function (user) {
  currentUser = user;
  if (user) {
    console.log("현재 로그인된 사용자 UID:", user.uid);
  }
  renderUserArea();
  render(); // 역할에 따른 삭제 버튼 노출을 위해 화면 재렌더링
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
    const role = getUserRole();
    const roleBadge = role === "teacher" ? "[교사 👨‍🏫]" : "[학생 👨‍🎓]";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${currentUser.displayName || currentUser.email} ${roleBadge} 님 환영합니다! `;
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
      role: data.role || "student",
      createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
    };
  });
  render();
});


// ===================================================
// 데이터를 다루는 함수 세 개 (역할 기반 권한 적용)
// ===================================================

// 메모를 읽어 옵니다.
function loadMemos() {
  return memos;
}

// 메모를 새로 씁니다. (학생 및 교사 본인 메모 생성)
async function addMemo(text) {
  if (!currentUser) {
    alert("로그인 후 메모를 작성할 수 있습니다.");
    return false;
  }

  const trimmed = text ? text.trim() : "";
  if (trimmed.length < 5) {
    alert("메모는 5글자 이상 입력해 주세요.");
    return false;
  }

  const role = getUserRole();

  try {
    await addDoc(memosCollection, {
      text: trimmed,
      createdAt: serverTimestamp(),
      uid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email || "익명",
      role: role
    });
    return true;
  } catch (error) {
    console.error("메모 작성 오류:", error);
    return false;
  }
}

// 메모를 지웁니다. (교사는 전체 삭제 가능, 학생은 자기 메모만 삭제 가능)
async function deleteMemo(id, memoUid) {
  if (!currentUser) {
    alert("로그인이 필요합니다.");
    return;
  }

  const role = getUserRole();

  // 교사(teacher)는 다른 사람 메모 삭제 포함 모든 삭제 권한 보유
  // 학생(student)은 본인 UID와 일치하는 자기 메모만 삭제 가능
  if (role !== "teacher" && memoUid !== currentUser.uid) {
    alert("학생은 본인이 작성한 메모만 삭제할 수 있습니다.");
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

  const role = getUserRole();
  const isMyMemo = currentUser && memo.uid === currentUser.uid;
  const isTeacher = role === "teacher";

  const del = document.createElement("button");
  del.textContent = "×";
  del.onclick = function () {
    deleteMemo(memo.id, memo.uid);
  };

  // 학생인데 본인 메모가 아닌 경우 삭제 버튼 숨김 (다른 사람 것은 건들지 못함)
  if (!isTeacher && !isMyMemo) {
    del.style.display = "none";
  }

  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  if (memo.authorName) {
    const author = document.createElement("div");
    author.style.fontSize = "12px";
    author.style.color = "#777";
    author.style.marginTop = "8px";

    const roleBadge = memo.role === "teacher" ? "[교사]" : "[학생]";
    author.textContent = `- ${memo.authorName} ${roleBadge}`;
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
