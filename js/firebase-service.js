/* =========================================================
   RUDRA BHAKTI — FIREBASE SERVICE LAYER
   js/firebase-service.js
   ========================================================= */

import {
  db
} from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   COLLECTIONS
   ========================================================= */

const COLLECTIONS = {
  reels: "reels",
  questions: "questions",
  feedback: "feedback",
  admins: "admins"
};


/* =========================================================
   REEL SERVICES
   ========================================================= */

/**
 * Get one Reel by Reel ID.
 * Example: RB0001
 */
export async function getReel(reelId) {
  if (!reelId) {
    throw new Error("Reel ID is required.");
  }

  const reelRef = doc(
    db,
    COLLECTIONS.reels,
    reelId
  );

  const snapshot = await getDoc(reelRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


/**
 * Get all Reels.
 * Admin use.
 */
export async function getAllReels() {
  const reelsRef = collection(
    db,
    COLLECTIONS.reels
  );

  const snapshot = await getDocs(reelsRef);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


/**
 * Get only active Reels.
 * Public feedback page use.
 */
export async function getActiveReels() {
  const reelsRef = collection(
    db,
    COLLECTIONS.reels
  );

  const reelsQuery = query(
    reelsRef,
    where("status", "==", "active"),
    where("feedbackEnabled", "==", true)
  );

  const snapshot =
    await getDocs(reelsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}


/**
 * Create a Reel using the generated Reel ID.
 * Example: RB0001
 */
export async function createReel(reel) {
  if (!reel?.reelId) {
    throw new Error("Reel ID is required.");
  }

  const reelId = reel.reelId;

  const reelRef = doc(
    db,
    COLLECTIONS.reels,
    reelId
  );

  const existing =
    await getDoc(reelRef);

  if (existing.exists()) {
    throw new Error(
      `Reel ${reelId} already exists.`
    );
  }

  const reelData = {
    reelId,

    title:
      reel.title?.trim() ||
      "Untitled Reel",

    reelUrl:
      reel.reelUrl?.trim() || "",

    thumbnailUrl:
      reel.thumbnailUrl?.trim() || "",

    status:
      reel.status || "active",

    feedbackEnabled:
      reel.feedbackEnabled !== false,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };

  await setDoc(
    reelRef,
    reelData
  );

  return {
    id: reelId,
    ...reelData
  };
}


/**
 * Update Reel.
 */
export async function updateReel(
  reelId,
  changes
) {
  if (!reelId) {
    throw new Error("Reel ID is required.");
  }

  const reelRef = doc(
    db,
    COLLECTIONS.reels,
    reelId
  );

  await updateDoc(
    reelRef,
    {
      ...changes,
      updatedAt:
        serverTimestamp()
    }
  );

  return getReel(reelId);
}


/**
 * Enable / disable feedback for a Reel.
 */
export async function setReelStatus(
  reelId,
  active
) {
  return updateReel(
    reelId,
    {
      status:
        active
          ? "active"
          : "inactive",

      feedbackEnabled:
        Boolean(active)
    }
  );
}


/* =========================================================
   QUESTION SERVICES
   ========================================================= */

/**
 * Get one question.
 */
export async function getQuestion(
  questionId
) {
  if (!questionId) {
    throw new Error(
      "Question ID is required."
    );
  }

  const questionRef = doc(
    db,
    COLLECTIONS.questions,
    questionId
  );

  const snapshot =
    await getDoc(questionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


/**
 * Get all active questions.
 */
export async function getActiveQuestions() {
  const questionsRef =
    collection(
      db,
      COLLECTIONS.questions
    );

  const questionsQuery = query(
    questionsRef,
    where("active", "==", true),
    orderBy("order", "asc")
  );

  const snapshot =
    await getDocs(questionsQuery);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data()
    })
  );
}


/**
 * Get all questions.
 * Admin use.
 */
export async function getAllQuestions() {
  const questionsRef =
    collection(
      db,
      COLLECTIONS.questions
    );

  const questionsQuery = query(
    questionsRef,
    orderBy("order", "asc")
  );

  const snapshot =
    await getDocs(questionsQuery);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data()
    })
  );
}


/* =========================================================
   FEEDBACK SERVICES
   ========================================================= */

/**
 * Submit public feedback.
 *
 * Important:
 * Public users can CREATE feedback,
 * but they should NOT be allowed to READ feedback.
 */
export async function submitFeedback(
  feedback
) {
  if (!feedback) {
    throw new Error(
      "Feedback data is required."
    );
  }

  if (!feedback.reelId) {
    throw new Error(
      "Reel ID is required."
    );
  }

  if (!feedback.sessionId) {
    throw new Error(
      "Session ID is required."
    );
  }

  if (
    !feedback.answers ||
    typeof feedback.answers !== "object"
  ) {
    throw new Error(
      "Answers are required."
    );
  }

  const feedbackData = {
    feedbackId: null,

    reelId:
      String(feedback.reelId),

    sessionId:
      String(feedback.sessionId),

    answers:
      feedback.answers,

    questionTiming:
      feedback.questionTiming || {},

    engagement:
      feedback.engagement || {},

    device:
      feedback.device || {},

    startedAt:
      feedback.startedAt || null,

    completedAt:
      feedback.completedAt || null,

    totalDurationMs:
      Number(
        feedback.totalDurationMs || 0
      ),

    createdAt:
      serverTimestamp()
  };

  const feedbackRef =
    await addDoc(
      collection(
        db,
        COLLECTIONS.feedback
      ),
      feedbackData
    );

  /*
   * Store the generated Firestore document
   * ID inside the returned object.
   */
  return {
    id: feedbackRef.id,
    ...feedbackData,
    feedbackId: feedbackRef.id
  };
}


/* =========================================================
   ADMIN RESPONSE SERVICES
   ========================================================= */

/**
 * Get responses for a specific Reel.
 *
 * This function should only be called after
 * Firebase Admin authorization is implemented.
 */
export async function getFeedbackByReel(
  reelId,
  maxResults = 100
) {
  if (!reelId) {
    throw new Error(
      "Reel ID is required."
    );
  }

  const feedbackRef =
    collection(
      db,
      COLLECTIONS.feedback
    );

  const feedbackQuery = query(
    feedbackRef,

    where(
      "reelId",
      "==",
      reelId
    ),

    orderBy(
      "createdAt",
      "desc"
    ),

    limit(maxResults)
  );

  const snapshot =
    await getDocs(feedbackQuery);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data()
    })
  );
}


/**
 * Get latest responses.
 */
export async function getLatestFeedback(
  maxResults = 50
) {
  const feedbackRef =
    collection(
      db,
      COLLECTIONS.feedback
    );

  const feedbackQuery = query(
    feedbackRef,

    orderBy(
      "createdAt",
      "desc"
    ),

    limit(maxResults)
  );

  const snapshot =
    await getDocs(feedbackQuery);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data()
    })
  );
}


/* =========================================================
   ADMIN CHECK
   ========================================================= */

/**
 * Temporary database-based admin check.
 *
 * Production authorization should additionally use
 * Firebase Auth custom claims:
 *
 * request.auth.token.admin == true
 */
export async function getAdminRecord(
  uid
) {
  if (!uid) {
    return null;
  }

  const adminRef =
    doc(
      db,
      COLLECTIONS.admins,
      uid
    );

  const snapshot =
    await getDoc(adminRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    uid: snapshot.id,
    ...snapshot.data()
  };
}


/* =========================================================
   UTILITY
   ========================================================= */

/**
 * Convert Firestore Timestamp,
 * JavaScript Date or ISO string
 * into a JavaScript Date.
 */
export function toJSDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


/**
 * Convert milliseconds to
 * human-readable duration.
 */
export function formatDuration(
  milliseconds
) {
  const ms =
    Number(milliseconds) || 0;

  if (ms <= 0) {
    return "—";
  }

  const totalSeconds =
    Math.round(ms / 1000);

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
